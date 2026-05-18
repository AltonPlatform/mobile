import {useCallback, useEffect, useRef} from 'react';
import {RewardedAd} from 'react-native-cas';

type Options = {
  onReward?: () => void;
  onFail?: () => void;
};

type PendingReward = {
  onReward: () => void;
  onFail?: () => void;
};

const pendingRewards: PendingReward[] = [];

let listenersAttached = false;
let rewardedLoaded = false;

function attachRewardListenersOnce() {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  RewardedAd.addAdUserEarnRewardEventListener(() => {
    const next = pendingRewards.shift();
    next?.onReward();
  });

  RewardedAd.addAdLoadedEventListener(() => {
    rewardedLoaded = true;
  });

  RewardedAd.addAdFailedToLoadEventListener(() => {
    rewardedLoaded = false;
  });

  RewardedAd.addAdFailedToShowEventListener(() => {
    rewardedLoaded = false;
    const next = pendingRewards.shift();
    next?.onFail?.();
  });

  RewardedAd.addAdDismissedEventListener(() => {
    rewardedLoaded = false;
    if (pendingRewards.length > 0) {
      const next = pendingRewards.shift();
      next?.onFail?.();
    }
  });

  RewardedAd.setAutoloadEnabled(true);
}

export function useCASRewarded({onReward, onFail}: Options) {
  const onRewardRef = useRef(onReward);
  const onFailRef = useRef(onFail);
  onRewardRef.current = onReward;
  onFailRef.current = onFail;

  useEffect(() => {
    attachRewardListenersOnce();
  }, []);

  const showRewarded = useCallback(() => {
    if (!rewardedLoaded) {
      onFailRef.current?.();
      return;
    }
    pendingRewards.push({
      onReward: () => onRewardRef.current?.(),
      onFail: () => onFailRef.current?.(),
    });
    rewardedLoaded = false;
    RewardedAd.showAd();
  }, []);

  return {showRewarded};
}
