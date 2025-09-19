import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const extensions = [
  { name: 'Waze', icon: 'car.fill', url: 'waze://' },
  { name: 'Google Maps', icon: 'map.fill', url: 'https://maps.google.com/' },
  { name: 'QuickBooks', icon: 'dollarsign.circle.fill', url: 'https://quickbooks.intuit.com/' },
  { name: 'SMS', icon: 'message.fill', url: 'sms:' },
  { name: 'WhatsApp', icon: 'phone.bubble.left.fill', url: 'whatsapp://' },
  { name: 'Email', icon: 'envelope.fill', url: 'mailto:' },
];

export default function ExtensionsScreen() {
  const colorScheme = useColorScheme();

  const handlePress = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log(`Don't know how to open this URL: ${url}`);
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Extensions</Text>
      <View style={styles.grid}>
        {extensions.map((ext) => (
          <TouchableOpacity
            key={ext.name}
            style={[styles.card, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
            onPress={() => handlePress(ext.url)}>
            <IconSymbol name={ext.icon} size={40} color={Colors[colorScheme ?? 'light'].tint} />
            <Text style={[styles.cardText, { color: Colors[colorScheme ?? 'light'].text }]}>
              {ext.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 20,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  cardText: {
    marginTop: 10,
    fontWeight: '600',
  },
});
