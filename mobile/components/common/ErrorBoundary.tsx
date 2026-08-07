import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as t from '@/theme';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      /* 🔴 `O-103` / `P79` — the opaque ground moved OFF the stop list and UNDER it, so the
            ramp is one hue and both alpha models agree. As written before, the straight-alpha
            midpoint bulged lighter than either end and took this screen's muted body copy to
            3.35:1 and its danger line to 3.23:1. Endpoints unchanged; worst point now 4.72 / 4.54.
            ⚠️ This is the LAST-RESORT surface — it renders when everything else has failed — so it
            is exactly the wrong place to have text nobody can read. */
      return (
        <LinearGradient
          colors={[t.alpha(t.color.accent, 0), t.alpha(t.color.accent, 10)]}
          style={{ flex: 1, backgroundColor: t.color.bg }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 48 /* GLYPH */, marginBottom: 16 }}>✨</Text>
            <Text
              style={{ ...t.txt('display-md').style, color: t.color.fg,
                marginBottom: 12,
                textAlign: 'center' }}
            >
              Something went wrong
            </Text>
            <Text {...t.txt('text-sm')}
              style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'],
                textAlign: 'center',
                marginBottom: 24 }}
            >
              We hit an unexpected issue. Please try again.
            </Text>
            <TouchableOpacity
              onPress={this.handleReset}
              style={{
                backgroundColor: t.color.accent,
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: t.radius.md,
                minWidth: 200,
                alignItems: 'center',
              }}
            >
              <Text {...t.txt('text-base')}
                style={{ ...t.txt('text-base').style, color: t.color.fg }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
            {__DEV__ && this.state.error && (
              <View
                style={{
                  marginTop: 24,
                  padding: 12,
                  backgroundColor: t.alpha(t.color.danger, 10),
                  borderRadius: t.radius.sm,
                  maxWidth: '100%',
                }}
              >
                <Text style={{ ...t.txt('text-2xs').style, color: t.color.danger }}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
