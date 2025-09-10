// File: components/TypingIndicator.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Card } from 'react-native-paper';

const TypingIndicator = () => {
  return (
    <Card style={styles.aiCard}>
      <Card.Content>
        <View style={styles.container}>
          {[...Array(3).keys()].map((index) => (
            <MotiView
              key={index}
              from={{ scale: 0.5, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'timing',
                duration: 500,
                delay: index * 200,
                loop: true,
              }}
              style={styles.dot}
            />
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  aiCard: { 
    marginVertical: 5, 
    maxWidth: '25%', 
    borderRadius: 16,
    alignSelf: 'flex-start', 
    backgroundColor: 'white' 
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#AAB8C2',
    marginHorizontal: 4,
  },
});

export default TypingIndicator;