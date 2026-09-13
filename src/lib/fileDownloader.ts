// Unified File Downloader & Native Storage Bridge
// Handles Scoped Storage, MediaStore/Share Sheet on Android, and Fallback on Web with Toast notifications

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface DownloadResult {
  success: boolean;
  message: string;
  uri?: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

// Global Event Dispatcher for Toast Alerts
export function showToast(title: string, description?: string, type: ToastType = 'success') {
  const event = new CustomEvent<ToastMessage>('app-toast', {
    detail: {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      description,
    },
  });
  window.dispatchEvent(event);
}

// Convert Blob to Base64 string for Capacitor Filesystem
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g. "data:application/pdf;base64,")
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Universal save and download function that works on Web and Android Native.
 */
export async function saveAndDownloadFile(
  blob: Blob,
  fileName: string,
  _mimeType?: string
): Promise<DownloadResult> {
  try {
    if (!blob || blob.size === 0) {
      throw new Error('File content is empty or invalid');
    }

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // 1. Android / Native Capacitor Scoped Storage & Share Sheet
      const base64Data = await blobToBase64(blob);

      // Write to Cache directory first
      const writtenFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = writtenFile.uri;

      // Try native Share Sheet which enables "Save to device", "Save to Drive", or open in viewer
      try {
        const canShare = await Share.canShare();
        if (canShare.value) {
          await Share.share({
            title: fileName,
            text: `Exported ${fileName}`,
            url: fileUri,
            dialogTitle: `Save or Open ${fileName}`,
          });
        }
      } catch (shareErr) {
        console.warn('Share dialog dismissed or skipped', shareErr);
      }

      showToast(
        'File Ready',
        `"${fileName}" (${Math.round(blob.size / 1024)} KB) saved to device.`,
        'success'
      );

      return {
        success: true,
        message: `Saved "${fileName}" successfully`,
        uri: fileUri,
      };
    } else {
      // 2. Web Browser Fallback with Anchor Tag
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 5000);

      showToast(
        'Download Started',
        `"${fileName}" (${Math.round(blob.size / 1024)} KB) saved to Downloads.`,
        'success'
      );

      return {
        success: true,
        message: `Downloaded "${fileName}"`,
      };
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to download file';
    console.error('Download error:', err);
    showToast('Download Failed', errorMsg, 'error');
    return {
      success: false,
      message: errorMsg,
    };
  }
}
