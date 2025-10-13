import { useEffect, useState } from "react";
import axios from "axios";

export function useChunkStatus(contentSourceId?: number) {
  const [status, setStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [chunks, setChunks] = useState<any[]>([]);

  useEffect(() => {
    if (!contentSourceId) {
      setStatus('processing');
      setChunks([]);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/sources/${contentSourceId}/chunks`);
        if (res.data.success && res.data.chunks && res.data.chunks.length > 0) {
          setStatus('complete');
          setChunks(res.data.chunks);
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Error polling chunk status:', e);
        setStatus('error');
        clearInterval(interval);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [contentSourceId]);

  return { status, chunks };
}
