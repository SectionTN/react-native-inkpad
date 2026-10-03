#import "INKPadView.h"

#import <PencilKit/PencilKit.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/InkpadViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/InkpadViewSpec/EventEmitters.h>
#import <react/renderer/components/InkpadViewSpec/Props.h>
#import <react/renderer/components/InkpadViewSpec/RCTComponentViewHelpers.h>

#import "INKBrushes.h"
#import "INKCanvasView.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface INKPadView () <RCTInkpadViewViewProtocol, PKCanvasViewDelegate>
@end

@implementation INKPadView {
  INKCanvasView *_canvas;
  INKBrushType _brushType;
  UIColor *_brushColor;
  CGFloat _brushSize;
  BOOL _erasing;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<InkpadViewComponentDescriptor>();
}

// The canvas holds user content and undo history, so Fabric must not recycle it.
+ (BOOL)shouldBeRecycled
{
  return NO;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const InkpadViewProps>();
    _props = defaultProps;

    _brushType = INKBrushTypePen;
    _brushColor = UIColor.blackColor;
    _brushSize = 3;

    _canvas = [[INKCanvasView alloc] initWithFrame:frame];
    _canvas.delegate = self;
    _canvas.drawingPolicy = PKCanvasViewDrawingPolicyAnyInput;
    _canvas.backgroundColor = UIColor.clearColor;
    _canvas.opaque = NO;
    _canvas.scrollEnabled = NO;
    // PencilKit shows black ink as white in dark mode. The canvas keeps the colors it was given.
    _canvas.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
    [self applyTool];

    self.contentView = _canvas;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<InkpadViewProps const>(props);

  switch (newProps.brushType) {
    case InkpadViewBrushType::Marker:
      _brushType = INKBrushTypeMarker;
      break;
    case InkpadViewBrushType::Highlighter:
      _brushType = INKBrushTypeHighlighter;
      break;
    default:
      _brushType = INKBrushTypePen;
  }
  _brushColor = RCTUIColorFromSharedColor(newProps.brushColor) ?: UIColor.blackColor;
  _brushSize = newProps.brushSize;
  _canvas.backgroundColor = RCTUIColorFromSharedColor(newProps.canvasColor) ?: UIColor.clearColor;
  _canvas.drawingGestureRecognizer.enabled = newProps.editable;
  _erasing = newProps.tool == InkpadViewTool::Erase;
  [self applyTool];

  [super updateProps:props oldProps:oldProps];
}

- (void)applyTool
{
  _canvas.tool = _erasing ? [[PKEraserTool alloc] initWithEraserType:PKEraserTypeVector]
                          : INKMakeInkingTool(_brushType, _brushColor, _brushSize);
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTInkpadViewHandleCommand(self, commandName, args);
}

- (void)undo
{
  if (_canvas.undoManager.canUndo) {
    [_canvas.undoManager undo];
  }
}

- (void)redo
{
  if (_canvas.undoManager.canRedo) {
    [_canvas.undoManager redo];
  }
}

- (void)clear
{
  if (_canvas.drawing.strokes.count > 0) {
    [self replaceDrawing:[PKDrawing new]];
  }
}

// Registering the reverse inside the undo handler is what makes redo work.
- (void)replaceDrawing:(PKDrawing *)drawing
{
  PKDrawing *previous = _canvas.drawing;
  [_canvas.undoManager registerUndoWithTarget:self
                                      handler:^(INKPadView *target) {
                                        [target replaceDrawing:previous];
                                      }];
  _canvas.drawing = drawing;
}

- (void)canvasViewDidBeginUsingTool:(PKCanvasView *)canvasView
{
  if (_eventEmitter && !_erasing) {
    std::static_pointer_cast<const InkpadViewEventEmitter>(_eventEmitter)->onInkStrokeStart({});
  }
}

- (void)canvasViewDidEndUsingTool:(PKCanvasView *)canvasView
{
  if (_eventEmitter && !_erasing) {
    std::static_pointer_cast<const InkpadViewEventEmitter>(_eventEmitter)->onInkStrokeEnd({});
  }
}

- (void)canvasViewDrawingDidChange:(PKCanvasView *)canvasView
{
  // Undo registration can land after this callback, so read the undo state on the next run loop turn.
  dispatch_async(dispatch_get_main_queue(), ^{
    [self emitChange];
  });
}

- (void)emitChange
{
  if (!_eventEmitter) {
    return;
  }
  InkpadViewEventEmitter::OnInkChange event;
  event.strokeCount = (int)_canvas.drawing.strokes.count;
  event.canUndo = _canvas.undoManager.canUndo;
  event.canRedo = _canvas.undoManager.canRedo;
  std::static_pointer_cast<const InkpadViewEventEmitter>(_eventEmitter)->onInkChange(event);
}

@end
