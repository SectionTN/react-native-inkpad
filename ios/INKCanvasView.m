#import "INKCanvasView.h"

#import <UIKit/UIGestureRecognizerSubclass.h>

// Sees each touch without joining recognition, so a stroke knows whether a finger or a pencil drew it.
@interface INKTouchTypeRecognizer : UIGestureRecognizer
@property (nonatomic) UITouchType lastTouchType;
@end

@implementation INKTouchTypeRecognizer

- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  self.lastTouchType = touches.anyObject.type;
  self.state = UIGestureRecognizerStateFailed;
}

@end

@implementation INKCanvasView {
  NSUndoManager *_inkUndoManager;
  INKTouchTypeRecognizer *_touchTypeRecognizer;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _inkUndoManager = [NSUndoManager new];
    _touchTypeRecognizer = [INKTouchTypeRecognizer new];
    _touchTypeRecognizer.cancelsTouchesInView = NO;
    _touchTypeRecognizer.delaysTouchesBegan = NO;
    _touchTypeRecognizer.delaysTouchesEnded = NO;
    [self addGestureRecognizer:_touchTypeRecognizer];
  }
  return self;
}

// PencilKit registers stroke undo here. A private manager keeps the app's undo away from the drawing.
- (NSUndoManager *)undoManager
{
  return _inkUndoManager;
}

- (UITouchType)lastTouchType
{
  return _touchTypeRecognizer.lastTouchType;
}

@end
