#import <PencilKit/PencilKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, INKBrushType) {
  INKBrushTypePen,
  INKBrushTypeMarker,
  INKBrushTypeHighlighter,
};

FOUNDATION_EXPORT PKInkType INKInkTypeForBrush(INKBrushType type);
FOUNDATION_EXPORT INKBrushType INKBrushForInkType(PKInkType inkType);
FOUNDATION_EXPORT PKInkingTool *INKMakeInkingTool(INKBrushType type, UIColor *color, CGFloat size);
FOUNDATION_EXPORT NSString *INKBrushName(INKBrushType type);
FOUNDATION_EXPORT INKBrushType INKBrushFromName(NSString *_Nullable name);

NS_ASSUME_NONNULL_END
