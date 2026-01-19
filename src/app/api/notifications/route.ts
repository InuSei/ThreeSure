import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase'; 
import { ref, push, serverTimestamp } from 'firebase/database';

const PROJECT_NAME = "ThreeSure";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // --- 1. RECEIVE DATA (Added 'location' here) ---
    const { fingerprintId, status, vaultId, location } = body;

    if (!vaultId || !status) {
      return NextResponse.json({ success: false, error: 'Missing vaultId or status' }, { status: 400 });
    }

    let logMessage = "";
    let alertType = "";

    // --- 2. DETERMINE ALERT TYPE ---
    if (status === "GRANTED") {
        alertType = "AUTHORIZED";
        logMessage = `${PROJECT_NAME}: Vault successfully opened (ID: ${fingerprintId || "Passcode"}).`;
    } else if (status === "DENIED") {
        alertType = "UNAUTHORIZED_ACCESS";
        logMessage = `⚠️ ${PROJECT_NAME} ALERT: Failed access attempt! (ID: ${fingerprintId || "Unknown"}).`;
    } else if (status === "TAMPERING") {
        alertType = "CRITICAL_ALERT"; 
        logMessage = `🚨 ${PROJECT_NAME} SECURITY: VIBRATION/TAMPERING DETECTED!`;
    } else {
        alertType = "INFO";
        logMessage = `${PROJECT_NAME}: System update - ${status}`;
    }

    console.log(`[${PROJECT_NAME}] Event: ${status} | Location: ${location}`);

    // --- 3. SAVE TO FIREBASE (Added 'location' here) ---
    const notificationsRef = ref(database, 'notifications');
    await push(notificationsRef, {
      type: alertType, 
      message: logMessage,
      vaultId: vaultId,
      rawStatus: status,
      fingerprintId: fingerprintId || "N/A",
      location: location || "Unknown Location", 
      timestamp: serverTimestamp(),
      read: false
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`[${PROJECT_NAME}] Error:`, error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}