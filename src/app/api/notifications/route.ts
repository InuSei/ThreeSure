import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase'; 
import { ref, push, get, child, serverTimestamp } from 'firebase/database';

const PROJECT_NAME = "ThreeSure";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // The ESP32 tells us WHAT happened (status) and WHO did it (fingerprintId)
    // status options: "GRANTED", "DENIED", "TAMPERING"
    const { fingerprintId, status, vaultId } = body;

    if (!vaultId || !status) {
      return NextResponse.json({ success: false, error: 'Missing vaultId or status' }, { status: 400 });
    }

    // --- 1. ENRICH THE DATA (Optional) ---
    // The ESP32 knows "ID #1", but we want to log "Kelly".
    // We still look up the name in Firebase, but we DO NOT check the password.
    let userName = "Unknown User";
    
    if (fingerprintId) {
        const dbRef = ref(database);
    }
  
    let logMessage = "";
    let alertType = "";

    if (status === "GRANTED") {
        alertType = "AUTHORIZED";
        logMessage = `${PROJECT_NAME}: Vault successfully opened (ID: ${fingerprintId || "Passcode"}).`;
    } else if (status === "DENIED") {
        alertType = "UNAUTHORIZED_ACCESS";
        logMessage = `⚠️ ${PROJECT_NAME} ALERT: Failed access attempt! (ID: ${fingerprintId || "Unknown"}).`;
    } else if (status === "TAMPERING") {
        alertType = "CRITICAL_ALERT"; // This triggers the Red Alert on dashboard
        logMessage = `🚨 ${PROJECT_NAME} SECURITY: VIBRATION/TAMPERING DETECTED!`;
    } else {
        alertType = "INFO";
        logMessage = `${PROJECT_NAME}: System update - ${status}`;
    }

    console.log(`[${PROJECT_NAME}] Event: ${status} | ID: ${fingerprintId}`);

    // --- 2. SAVE TO FIREBASE ---
    const notificationsRef = ref(database, 'notifications');
    await push(notificationsRef, {
      type: alertType, 
      message: logMessage,
      vaultId: vaultId,
      rawStatus: status,
      fingerprintId: fingerprintId || "N/A",
      timestamp: serverTimestamp(),
      read: false
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`[${PROJECT_NAME}] Error:`, error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}