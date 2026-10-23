#include <stdio.h>
#include <stdlib.h>

#include "../../../ios/INKPenModel.h"

// Reads "tool size count" and count lines of six numbers, prints one width per line.
int main(void)
{
  int tool = 0;
  double size = 0;
  size_t count = 0;
  if (scanf("%d %lf %zu", &tool, &size, &count) != 3) return 1;
  double *points = malloc(sizeof(double) * 6 * (count > 0 ? count : 1));
  double *widths = malloc(sizeof(double) * (count > 0 ? count : 1));
  for (size_t i = 0; i < count * 6; i++) {
    if (scanf("%lf", &points[i]) != 1) return 1;
  }
  INKPenWidths(points, count, size, (INKPenTool)tool, INKPenUnitLengthCm, widths);
  for (size_t i = 0; i < count; i++) printf("%.6f\n", widths[i]);
  free(points);
  free(widths);
  return 0;
}
