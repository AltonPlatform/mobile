import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Linking,
} from 'react-native';
import WebView, {
  type WebViewNavigation,
  type WebViewOpenWindowEvent,
} from 'react-native-webview';
import {useTranslation} from 'react-i18next';

import {colors, space} from '../theme/tokens';
import {
  canOpenTelegramApp,
  extractOAuthCode,
  isNativeTelegramAuthCallback,
  isTelegramAppLink,
  isTelegramOAuthCallbackUrl,
} from '../utils/telegramAuthLinks';

interface Props {
  visible: boolean;
  authUrl: string;
  redirectUri: string;
  onCode: (code: string) => void;
  onCancel: () => void;
}

export function TelegramAuthModal({
  visible,
  authUrl,
  redirectUri,
  onCode,
  onCancel,
}: Props) {
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [webviewDismissed, setWebviewDismissed] = useState(false);
  const [noTelegramAppBanner, setNoTelegramAppBanner] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const codeExtracted = useRef(false);

  useEffect(() => {
    if (!visible) {
      setNoTelegramAppBanner(false);
      return;
    }
    setWebviewDismissed(false);
    codeExtracted.current = false;
    setLoading(true);

    void canOpenTelegramApp().then(can => {
      if (!can) {
        setNoTelegramAppBanner(true);
      }
    });
  }, [visible, authUrl]);

  const finishWithCode = useCallback(
    (code: string) => {
      if (codeExtracted.current) return;
      codeExtracted.current = true;
      webViewRef.current?.stopLoading();
      setWebviewDismissed(true);
      setLoading(false);
      onCode(code);
    },
    [onCode],
  );

  const tryExtractCodeFromUrl = useCallback(
    (url: string): boolean => {
      if (codeExtracted.current) return true;

      if (
        isTelegramOAuthCallbackUrl(url, redirectUri) ||
        isNativeTelegramAuthCallback(url)
      ) {
        const code = extractOAuthCode(url);
        if (code) {
          finishWithCode(code);
          return true;
        }
        try {
          const error = new URL(url).searchParams.get('error');
          if (error) {
            codeExtracted.current = true;
            console.warn('Telegram auth error:', error);
            onCancel();
            return true;
          }
        } catch {
          /* ignore */
        }
      }
      return false;
    },
    [redirectUri, finishWithCode, onCancel],
  );

  const tryOpenTelegramApp = useCallback(async (url: string) => {
    const can = await canOpenTelegramApp();
    if (!can) {
      setNoTelegramAppBanner(true);
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setNoTelegramAppBanner(true);
    }
  }, []);

  const handleNavigationChange = useCallback(
    (event: WebViewNavigation) => {
      if (codeExtracted.current) return;

      const url = event.url;
      if (isTelegramAppLink(url)) {
        void tryOpenTelegramApp(url);
        return;
      }
      tryExtractCodeFromUrl(url);
    },
    [tryOpenTelegramApp, tryExtractCodeFromUrl],
  );

  const handleShouldStartLoad = useCallback(
    (event: {url: string}) => {
      const {url} = event;

      if (isTelegramAppLink(url)) {
        void tryOpenTelegramApp(url);
        return false;
      }

      if (tryExtractCodeFromUrl(url)) {
        return false;
      }

      return true;
    },
    [tryOpenTelegramApp, tryExtractCodeFromUrl],
  );

  const handleOpenWindow = useCallback(
    (event: WebViewOpenWindowEvent) => {
      const targetUrl = event.nativeEvent.targetUrl;
      if (!targetUrl) return;

      if (isTelegramAppLink(targetUrl)) {
        void tryOpenTelegramApp(targetUrl);
        return;
      }

      if (tryExtractCodeFromUrl(targetUrl)) {
        return;
      }

      webViewRef.current?.injectJavaScript(
        `window.location.href = ${JSON.stringify(targetUrl)}; true;`,
      );
    },
    [tryOpenTelegramApp, tryExtractCodeFromUrl],
  );

  const handleLoadEnd = useCallback(() => setLoading(false), []);

  const handleModalHide = useCallback(() => {
    codeExtracted.current = false;
    setWebviewDismissed(false);
    setNoTelegramAppBanner(false);
    setLoading(true);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      onDismiss={handleModalHide}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('Sign in with Telegram')}</Text>
          <View style={styles.placeholder} />
        </View>

        {noTelegramAppBanner && visible && !webviewDismissed ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>
              {t('telegram_auth_app_not_installed')}
            </Text>
            <Text style={styles.bannerHint}>
              {t('telegram_auth_phone_login_hint')}
            </Text>
            <TouchableOpacity
              style={styles.bannerDismiss}
              onPress={() => setNoTelegramAppBanner(false)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.bannerDismissText}>
                {t('telegram_auth_banner_dismiss')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {visible && authUrl && !webviewDismissed ? (
          <WebView
            ref={webViewRef}
            source={{uri: authUrl}}
            style={styles.webview}
            onNavigationStateChange={handleNavigationChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onOpenWindow={handleOpenWindow}
            setSupportMultipleWindows={Platform.OS === 'android'}
            onLoadEnd={handleLoadEnd}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={Platform.OS === 'android'}
            userAgent={
              Platform.OS === 'android'
                ? 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
                : undefined
            }
          />
        ) : null}

        {webviewDismissed && visible ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.signingIn}>{t('Login')}…</Text>
          </View>
        ) : null}

        {loading && visible && !webviewDismissed && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeBtn: {width: 40, alignItems: 'center'},
  closeText: {fontSize: 20, color: colors.textSecondary},
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeholder: {width: 40},
  banner: {
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bannerHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  bannerDismiss: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingVertical: 4,
  },
  bannerDismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  webview: {flex: 1, backgroundColor: colors.bg},
  loader: {
    ...StyleSheet.absoluteFillObject,
    top: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,27,0.92)',
  },
  signingIn: {marginTop: 12, fontSize: 15, color: colors.textSecondary},
});
