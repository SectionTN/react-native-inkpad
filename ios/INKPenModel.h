#ifndef INKPenModel_h
#define INKPenModel_h

#include <stddef.h>

typedef enum { INKPenToolTouch = 0, INKPenToolMouse = 1, INKPenToolStylus = 2 } INKPenTool;

// Documents count 160 units per inch, like Android dp.
#define INKPenUnitLengthCm (2.54 / 160.0)

// Width at each raw point (x, y, ms, pressure, tilt, orientation), the way androidx.ink sizes inkpad's pen.
void INKPenWidths(const double *points, size_t count, double size, INKPenTool tool, double unitLengthCm,
                  double *widths);

#endif
