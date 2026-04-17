import { Component, type ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Colors, Spacing, Radius, Typography } from '@/constants'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary]', error)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.subtitle}>Ошибка: {this.state.message ?? 'Неизвестно'}</Text>
          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.btnText}>Попробовать снова</Text>
          </Pressable>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  title: { ...Typography.h3, textAlign: 'center' },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primarySurface,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  btnText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
})
