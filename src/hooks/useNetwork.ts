import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetwork() {
  const [online, setOnline] = useState<boolean>(true);
  useEffect(() => {
    const sub = NetInfo.addEventListener((s: any) => {
      setOnline(!!s.isConnected && !!s.isInternetReachable);
    });
    NetInfo.fetch().then((s: any) => setOnline(!!s.isConnected && !!s.isInternetReachable));
    return () => sub();
  }, []);
  return online;
}
