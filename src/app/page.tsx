"use client";

import { useState, useEffect, useRef } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue, query, limitToLast, remove } from "firebase/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, Clock, Trash2, Fingerprint, Activity, MapPin } from "lucide-react"; // <--- ADDED MapPin
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// --- TYPES ---
interface ThreeSureLog {
  id: string;
  type: 'AUTHORIZED' | 'UNAUTHORIZED_ACCESS' | 'CRITICAL_ALERT' | 'INFO';
  message: string;
  vaultId: string;
  fingerprintId?: string;
  location?: string; // <--- This allows TS to know location exists
  timestamp: number;
}

const LogCard = ({ log, onDelete }: { log: ThreeSureLog, onDelete: (id: string) => void }) => {
  const [time, setTime] = useState('');

  // 1. Determine Style based on Alert Type
  let bgColor = "bg-gray-100 text-gray-700";
  let borderColor = "border-l-gray-400";
  let Icon = Activity;

  if (log.type === 'AUTHORIZED') {
    bgColor = "bg-green-100 text-green-700";
    borderColor = "border-l-green-500";
    Icon = ShieldCheck;
  } else if (log.type === 'UNAUTHORIZED_ACCESS') {
    bgColor = "bg-orange-100 text-orange-700";
    borderColor = "border-l-orange-500";
    Icon = ShieldAlert;
  } else if (log.type === 'CRITICAL_ALERT') {
    bgColor = "bg-red-600 text-white animate-pulse"; 
    borderColor = "border-l-red-900";
    Icon = ShieldAlert;
  }

  useEffect(() => {
    try {
        setTime(formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }));
    } catch (e) {
        setTime("Just now");
    }
  }, [log.timestamp]);

  return (
    <Card className={`mb-3 border-l-4 ${borderColor} shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2`}>
      <CardContent className="p-4 grid grid-cols-[auto,1fr,auto] items-center gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-full ${bgColor}`}>
           <Icon className="h-6 w-6" />
        </div>

        {/* Message */}
        <div>
          <p className={`font-bold ${log.type === 'CRITICAL_ALERT' ? 'text-red-600' : 'text-foreground'}`}>
            {log.type.replace('_', ' ')}
          </p>
          <p className="text-sm text-muted-foreground">{log.message}</p>
          
          {/* Metadata Chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            
            {/* ID CHIP */}
            {log.fingerprintId && (
                <span className="text-xs bg-secondary px-2 py-1 rounded flex items-center gap-1">
                    <Fingerprint size={12}/> ID: {log.fingerprintId}
                </span>
            )}
            
            {/* VAULT CHIP */}
            <span className="text-xs bg-secondary px-2 py-1 rounded">
                Vault: {log.vaultId}
            </span>

            {/* LOCATION CHIP (The Missing Piece!) */}
            {log.location && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded flex items-center gap-1">
                    <MapPin size={12}/> {log.location}
                </span>
            )}

          </div>
        </div>

        {/* Time & Delete */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            <span>{time}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => onDelete(log.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  const [logs, setLogs] = useState<ThreeSureLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const lastLogIdRef = useRef<string | null>(null);

  useEffect(() => {
    const notificationsRef = ref(database, 'notifications');
    const recentQuery = query(notificationsRef, limitToLast(50));

    const unsubscribe = onValue(recentQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: ThreeSureLog[] = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key]
          }))
          .sort((a, b) => b.timestamp - a.timestamp); 

        setLogs(list);
      } else {
        setLogs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (logs.length === 0) return;
    const latestLog = logs[0];

    if (lastLogIdRef.current === null) {
        lastLogIdRef.current = latestLog.id;
        return;
    }

    if (latestLog.id !== lastLogIdRef.current) {
        lastLogIdRef.current = latestLog.id; 

        if (latestLog.type === 'CRITICAL_ALERT') {
            toast({
                title: "🚨 SECURITY BREACH DETECTED",
                description: "Vibration sensor triggered on Vault!",
                variant: "destructive",
                duration: 10000 
            });
        } else if (latestLog.type === 'UNAUTHORIZED_ACCESS') {
            toast({
                title: "⚠️ Access Denied",
                description: latestLog.message,
                variant: "destructive",
            });
        } else if (latestLog.type === 'AUTHORIZED') {
             toast({
                title: "✅ Access Granted",
                description: latestLog.message,
            });
        }
    }
  }, [logs, toast]); 

  const handleDelete = (id: string) => {
    remove(ref(database, `notifications/${id}`));
  };

  const handleClearAll = () => {
    if(confirm("Are you sure you want to clear the entire security log?")) {
        remove(ref(database, 'notifications'));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-4xl">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">ThreeSure</h1>
                    <p className="text-xs text-slate-500 font-medium">SECURITY MONITOR</p>
                </div>
            </div>
            
            {logs.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll} className="text-red-500 hover:bg-red-50 border-red-200">
                    Clear Log
                </Button>
            )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Status Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-6 flex flex-col items-center text-center">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">{logs.length}</span>
                    <span className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Total Events</span>
                </CardContent>
             </Card>
             <Card className="md:col-span-2 bg-white dark:bg-slate-800">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">System Status</h3>
                        <p className="text-sm text-muted-foreground">Real-time connection active</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium text-green-600">ONLINE</span>
                    </div>
                </CardContent>
             </Card>
        </div>

        {/* Log List */}
        <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Activity Log</h2>
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-20 opacity-50 border-2 border-dashed rounded-xl">
                    <ShieldCheck className="mx-auto h-12 w-12 mb-2 text-slate-300" />
                    <p>No security events recorded yet.</p>
                </div>
            ) : (
                logs.map(log => (
                    <LogCard key={log.id} log={log} onDelete={handleDelete} />
                ))
            )}
        </div>
      </div>
    </main>
  );
}