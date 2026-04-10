import { StyleSheet } from 'react-native'
import { Colors } from './colors'

export const Typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.text,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textTertiary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  number: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
  },
  numberSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
})

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
}
