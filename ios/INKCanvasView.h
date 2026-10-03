#import <PencilKit/PencilKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface INKCanvasView : PKCanvasView

@property (nonatomic, readonly) UITouchType lastTouchType;

@end

NS_ASSUME_NONNULL_END
