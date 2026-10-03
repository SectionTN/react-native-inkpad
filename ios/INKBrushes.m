#import "INKBrushes.h"

PKInkType INKInkTypeForBrush(INKBrushType type)
{
  switch (type) {
    case INKBrushTypeMarker:
      if (@available(iOS 17.0, *)) {
        return PKInkTypeMonoline;
      }
      return PKInkTypePen;
    case INKBrushTypeHighlighter:
      return PKInkTypeMarker;
    default:
      return PKInkTypePen;
  }
}

INKBrushType INKBrushForInkType(PKInkType inkType)
{
  if ([inkType isEqualToString:PKInkTypeMarker]) {
    return INKBrushTypeHighlighter;
  }
  if (@available(iOS 17.0, *)) {
    if ([inkType isEqualToString:PKInkTypeMonoline]) {
      return INKBrushTypeMarker;
    }
  }
  return INKBrushTypePen;
}

PKInkingTool *INKMakeInkingTool(INKBrushType type, UIColor *color, CGFloat size)
{
  PKInkType inkType = INKInkTypeForBrush(type);
  CGFloat width = MIN(MAX(size, [PKInkingTool minimumWidthForInkType:inkType]),
                      [PKInkingTool maximumWidthForInkType:inkType]);
  return [[PKInkingTool alloc] initWithInkType:inkType color:color width:width];
}

NSString *INKBrushName(INKBrushType type)
{
  switch (type) {
    case INKBrushTypeMarker:
      return @"marker";
    case INKBrushTypeHighlighter:
      return @"highlighter";
    default:
      return @"pen";
  }
}

INKBrushType INKBrushFromName(NSString *name)
{
  if ([name isEqualToString:@"marker"]) {
    return INKBrushTypeMarker;
  }
  if ([name isEqualToString:@"highlighter"]) {
    return INKBrushTypeHighlighter;
  }
  return INKBrushTypePen;
}
