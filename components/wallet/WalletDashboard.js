import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function WalletDashboard() {
  const { isDark } = useTheme();
  
  const [balance, setBalance] = useState(1250); 
  const [creatorEarnings, setCreatorEarnings] = useState(450); 
  
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const accentCol = '#087EFF'; 
  const goldCol = '#FFD700';

  const transactions = [
    { id: 't1', type: 'expense', title: 'Nax Ludo Multi (Entry)', amount: -20, date: 'Today, 2:30 PM', icon: 'gamepad-variant', color: '#FF3B30' },
    { id: 't2', type: 'income', title: 'App Revenue (Tic-Tac-Toe)', amount: +320, date: 'Yesterday', icon: 'chart-line', color: '#087EFF' },
  ];

  return (
    <View>
      <View style={[styles.balanceCard, { backgroundColor: accentCol }]}>
        <Text style={styles.balanceLabel}>Total Tokens</Text>
        <View style={styles.balanceRow}>
          <FontAwesome5 name="coins" size={24} color={goldCol} style={{ marginRight: 10 }} />
          <Text style={styles.balanceAmount}>{balance}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="add-circle" size={20} color={accentCol} />
            <Text style={[styles.actionText, { color: accentCol }]}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="send" size={18} color={accentCol} />
            <Text style={[styles.actionText, { color: accentCol }]}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.creatorCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.creatorHeader}>
          <Text style={[styles.creatorTitle, { color: textMain }]}>App Revenue (Creator)</Text>
          <Text style={[styles.creatorEarnAmount, { color: '#34C759' }]}>+{creatorEarnings} 🪙</Text>
        </View>
        <TouchableOpacity style={[styles.withdrawBtn, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
          <Text style={styles.withdrawText}>Withdraw to Bank</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.txContainer, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {transactions.map(tx => (
          <View key={tx.id} style={[styles.txCard, { borderBottomColor: borderCol }]}>
            <View style={[styles.txIconBox, { backgroundColor: `${tx.color}15` }]}>
              <MaterialCommunityIcons name={tx.icon} size={20} color={tx.color} />
            </View>
            <View style={styles.txDetails}>
              <Text style={[styles.txTitle, { color: textMain }]} numberOfLines={1}>{tx.title}</Text>
              <Text style={[styles.txDate, { color: textSub }]}>{tx.date}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.type === 'income' ? '#34C759' : textMain }]}>
              {tx.type === 'income' ? '+' : ''}{tx.amount} 🪙
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: { padding: 25, borderRadius: 20, elevation: 3, marginBottom: 15 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  balanceAmount: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginHorizontal: 5 },
  actionText: { fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  creatorCard: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 15 },
  creatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  creatorTitle: { fontSize: 15, fontWeight: 'bold' },
  creatorEarnAmount: { fontSize: 18, fontWeight: 'bold' },
  withdrawBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  withdrawText: { color: '#34C759', fontWeight: 'bold', fontSize: 13 },
  txContainer: { borderRadius: 15, borderWidth: 1, overflow: 'hidden' },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  txIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  txDate: { fontSize: 11 },
  txAmount: { fontSize: 14, fontWeight: 'bold' }
});
