#import "INKCanvasView.h"

@implementation INKCanvasView {
  NSUndoManager *_inkUndoManager;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _inkUndoManager = [NSUndoManager new];
  }
  return self;
}

// PencilKit registers stroke undo here. A private manager keeps the app's undo away from the drawing.
- (NSUndoManager *)undoManager
{
  return _inkUndoManager;
}

@end
