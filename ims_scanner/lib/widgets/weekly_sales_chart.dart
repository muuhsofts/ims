import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/app_theme.dart';
import '../../models/dashboard_models.dart';

class WeeklySalesChart extends StatelessWidget {
  final List<WeeklySale> weeklySales;

  const WeeklySalesChart({super.key, required this.weeklySales});

  @override
  Widget build(BuildContext context) {
    if (weeklySales.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: AppTheme.cardDecoration(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [Icon(Icons.show_chart, color: AppTheme.primaryColor), const SizedBox(width: 8), Text('Weekly Sales Trend (Last 7 Days)', style: AppTheme.headline2)]),
          const SizedBox(height: 16),
          SizedBox(
            height: 250,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(show: true),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (value, meta) => Text('${value.toInt()}'))),
                  bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 60, getTitlesWidget: (value, meta) {
                    int index = value.toInt();
                    if (index < 0 || index >= weeklySales.length) return const Text('');
                    return Text(weeklySales[index].day, style: const TextStyle(fontSize: 10));
                  })),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: weeklySales.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.salesCount.toDouble())).toList(),
                    isCurved: true,
                    color: AppTheme.primaryColor,
                    barWidth: 3,
                    dotData: FlDotData(show: true),
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}