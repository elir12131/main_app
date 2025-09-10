// File: theme.js
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme, // Inherit default theme properties
  colors: {
    ...DefaultTheme.colors, // Inherit default color properties
    primary: '#007AFF',      // A modern blue for focused fields and buttons
    secondary: '#5856D6',    // A modern purple for other interactive elements
    tertiary: '#34C759',     // A modern green
    background: '#F5F5F7',  // A light gray for screen backgrounds
    onSurfaceVariant: '#8A8A8E', // Color for unfocused outlines and secondary text
  },
};