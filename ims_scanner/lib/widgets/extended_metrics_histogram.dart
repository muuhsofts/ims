import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/app_theme.dart';
import '../../models/dashboard_models.dart';

class ExtendedMetricsHistogram extends StatelessWidget {
  final ExtendedAnalytics extended;
  final double screenWidth;

  const ExtendedMetricsHistogram({
    super.key,
    required this.extended,
    required this.screenWidth,
  });

  @override
  Widget build(BuildContext context) {
    final List<String> categories = [
      'Agent Stock',
      'CC Stock',
      'Distributed Qty',
      'Pending Dist.',
      'Stock Mov.',
      'Transfer Req.'
    ];

    final List<double> values = [
      extended.agentInventory.totalQuantity.toDouble(),
      extended.collectionCenterInventory.totalQuantity.toDouble(),
      extended.stockDistributions.totalQuantity.toDouble(),
      extended.stockDistributions.pendingCount.toDouble(),
      extended.stockMovements.totalMovements.toDouble(),
      extended.transferRequests.totalRequests.toDouble(),
    ];

    // Responsive height
    double chartHeight;
    if (screenWidth < 400) {
      chartHeight = 200;
    } else if (screenWidth < 600) {
      chartHeight = 240;
    } else if (screenWidth < 900) {
      chartHeight = 280;
    } else {
      chartHeight = 350;
    }

    // Responsive bar width
    double barWidth = screenWidth < 400 ? 18 : (screenWidth < 600 ? 22 : 28);

    // Responsive font sizes
    double bottomFontSize = screenWidth < 400 ? 8 : (screenWidth < 600 ? 9 : 11);
    double leftFontSize = screenWidth < 400 ? 10 : 12;

    final maxValue = values.isEmpty ? 1 : values.reduce((a, b) => a > b ? a : b);
    final yMax = maxValue * 1.1;

    return Container(
      decoration: AppTheme.cardDecoration(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.bar_chart, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              Text(
                'Operational Metrics Histogram',
                style: AppTheme.headline2.copyWith(fontSize: screenWidth < 400 ? 16 : 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: chartHeight,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: yMax,
                barGroups: categories.asMap().entries.map((entry) {
                  final index = entry.key;
                  return BarChartGroupData(
                    x: index,
                    barsSpace: 6,
                    barRods: [
                      BarChartRodData(
                        toY: values[index],
                        color: AppTheme.primaryColor,
                        width: barWidth,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ],
                  );
                }).toList(),
                titlesData: FlTitlesData(
                  show: true,
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          value.toInt().toString(),
                          style: TextStyle(fontSize: leftFontSize),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 50,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index < 0 || index >= categories.length) {
                          return const Text('');
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            categories[index],
                            style: TextStyle(fontSize: bottomFontSize),
                            textAlign: TextAlign.center,
                          ),
                        );
                      },
                    ),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                borderData: FlBorderData(show: false),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxValue / 5,
                ),
                barTouchData: BarTouchData(
                  enabled: true,
                  touchTooltipData: BarTouchTooltipData(
                    tooltipRoundedRadius: 8,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      return BarTooltipItem(
                        '${categories[group.x.toInt()]}\n${rod.toY.toInt()}',
                        const TextStyle(color: Colors.white, fontSize: 12),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}