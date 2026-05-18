import {useEffect} from 'react';
import {Platform} from 'react-native';
import CASMobileAds from 'react-native-cas';
import {CAS_ID} from '../config';

let initStarted = false;

/** Initializes CAS.AI once at app startup (test ads in dev). */
export function useCASInit() {
  useEffect(() => {
    if (initStarted) {
      return;
    }
    initStarted = true;

    CASMobileAds.setDebugLoggingEnabled(__DEV__);

    const casId =
      Platform.select({
        android: CAS_ID,
        ios: CAS_ID,
        default: CAS_ID,
      }) ?? CAS_ID;

    CASMobileAds.initialize(casId, {
      forceTestAds: true,
      showConsentFormIfRequired: false,
    })
      .then(status => {
        if (status.error && __DEV__) {
          console.warn('[CAS] initialization error:', status.error);
        }
      })
      .catch(e => {
        if (__DEV__) {
          console.warn('[CAS] initialization failed:', e);
        }
      });
  }, []);
}
