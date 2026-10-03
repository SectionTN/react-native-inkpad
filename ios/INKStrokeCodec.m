#import "INKStrokeCodec.h"

#import "INKColor.h"

static const NSUInteger INKStride = 6;
// Apple Pencil reports force up to about 4.17. Documents store pressure from 0 to 1.
static const CGFloat INKMaxForce = 4.1667;

@implementation INKBrushInfo
@end

@implementation INKDecodedDrawing
@end

static double INKRound(double value, double factor)
{
  return round(value * factor) / factor;
}

static double INKWrapAngle(double angle)
{
  double wrapped = fmod(angle, 2 * M_PI);
  return wrapped < 0 ? wrapped + 2 * M_PI : wrapped;
}

static CGFloat INKPointWidth(INKBrushType type, CGFloat size, double pressure)
{
  if (type == INKBrushTypePen && pressure >= 0) {
    return size * (0.4 + 0.6 * pressure);
  }
  return size;
}

@implementation INKStrokeCodec

+ (NSString *)encodeDrawing:(PKDrawing *)drawing
                       size:(CGSize)size
                    brushes:(NSDictionary<NSDate *, INKBrushInfo *> *)brushes
{
  NSMutableArray *strokes = [NSMutableArray arrayWithCapacity:drawing.strokes.count];
  for (PKStroke *stroke in drawing.strokes) {
    INKBrushInfo *info = brushes[stroke.path.creationDate];
    INKBrushType type = info ? info.type : INKBrushForInkType(stroke.ink.inkType);
    NSString *color = info ? info.color : INKHexFromColor(stroke.ink.color);
    NSString *input = info ? info.input : @"touch";
    CGFloat brushSize = info ? info.size : [self estimatedSize:stroke];
    BOOL stylus = [input isEqualToString:@"stylus"];

    NSMutableArray<NSNumber *> *points = [NSMutableArray arrayWithCapacity:stroke.path.count * INKStride];
    long long previousTime = 0;
    for (NSUInteger i = 0; i < stroke.path.count; i++) {
      PKStrokePoint *point = [stroke.path pointAtIndex:i];
      CGPoint location = CGPointApplyAffineTransform(point.location, stroke.transform);
      long long time = MAX(previousTime, llround(point.timeOffset * 1000));
      previousTime = time;
      [points addObject:@(INKRound(location.x, 100))];
      [points addObject:@(INKRound(location.y, 100))];
      [points addObject:@(time)];
      if (stylus) {
        [points addObject:@(INKRound(MIN(1, MAX(0, point.force / INKMaxForce)), 1000))];
        [points addObject:@(INKRound(MIN(M_PI_2, MAX(0, M_PI_2 - point.altitude)), 1000))];
        [points addObject:@(INKRound(INKWrapAngle(point.azimuth), 1000))];
      } else {
        [points addObjectsFromArray:@[ @-1, @-1, @-1 ]];
      }
    }
    [strokes addObject:@{
      @"brush" : @{@"type" : INKBrushName(type), @"color" : color, @"size" : @(brushSize)},
      @"input" : input,
      @"points" : points,
    }];
  }
  NSDictionary *document = @{
    @"version" : @1,
    @"size" : @{@"width" : @(size.width), @"height" : @(size.height)},
    @"strokes" : strokes,
  };
  NSData *data = [NSJSONSerialization dataWithJSONObject:document options:0 error:nil];
  return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
}

+ (CGFloat)estimatedSize:(PKStroke *)stroke
{
  CGFloat widest = 0;
  for (NSUInteger i = 0; i < stroke.path.count; i++) {
    widest = MAX(widest, [stroke.path pointAtIndex:i].size.width);
  }
  return widest > 0 ? widest : 3;
}

+ (INKDecodedDrawing *)decode:(NSString *)json errorCode:(NSString **)errorCode message:(NSString **)message
{
  NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
  id root = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  if (![root isKindOfClass:NSDictionary.class]) {
    return [self fail:@"document is not a JSON object" errorCode:errorCode message:message];
  }
  NSNumber *version = root[@"version"];
  if ([version isKindOfClass:NSNumber.class] && version.integerValue > 1) {
    *errorCode = @"E_UNSUPPORTED_VERSION";
    *message = [NSString stringWithFormat:@"document version %@ is newer than 1", version];
    return nil;
  }
  if (![version isKindOfClass:NSNumber.class] || version.integerValue != 1) {
    return [self fail:@"version must be 1" errorCode:errorCode message:message];
  }
  NSArray *strokes = root[@"strokes"];
  if (![strokes isKindOfClass:NSArray.class]) {
    return [self fail:@"strokes must be an array" errorCode:errorCode message:message];
  }

  NSDate *base = [NSDate date];
  NSMutableArray<PKStroke *> *result = [NSMutableArray arrayWithCapacity:strokes.count];
  NSMutableDictionary<NSDate *, INKBrushInfo *> *brushes = [NSMutableDictionary new];
  for (NSUInteger index = 0; index < strokes.count; index++) {
    NSDictionary *stroke = [strokes[index] isKindOfClass:NSDictionary.class] ? strokes[index] : nil;
    NSDictionary *brush = stroke[@"brush"];
    NSArray<NSNumber *> *values = stroke[@"points"];
    if (![brush isKindOfClass:NSDictionary.class] || !INKIsHexColor(brush[@"color"]) ||
        ![values isKindOfClass:NSArray.class] || values.count == 0 || values.count % INKStride != 0) {
      NSString *reason = [NSString stringWithFormat:@"strokes[%lu] is not a valid stroke", (unsigned long)index];
      return [self fail:reason errorCode:errorCode message:message];
    }
    INKBrushInfo *info = [INKBrushInfo new];
    info.type = INKBrushFromName(brush[@"type"]);
    info.color = [brush[@"color"] uppercaseString];
    info.size = [brush[@"size"] doubleValue];
    info.input = [stroke[@"input"] isKindOfClass:NSString.class] ? stroke[@"input"] : @"touch";

    NSMutableArray<PKStrokePoint *> *controlPoints = [NSMutableArray arrayWithCapacity:values.count / INKStride];
    for (NSUInteger i = 0; i < values.count; i += INKStride) {
      double pressure = values[i + 3].doubleValue;
      double tilt = values[i + 4].doubleValue;
      double orientation = values[i + 5].doubleValue;
      CGFloat width = INKPointWidth(info.type, info.size, pressure);
      PKStrokePoint *point =
          [[PKStrokePoint alloc] initWithLocation:CGPointMake(values[i].doubleValue, values[i + 1].doubleValue)
                                       timeOffset:values[i + 2].doubleValue / 1000.0
                                             size:CGSizeMake(width, width)
                                          opacity:1
                                            force:pressure >= 0 ? pressure * INKMaxForce : 1
                                          azimuth:orientation >= 0 ? orientation : 0
                                         altitude:tilt >= 0 ? M_PI_2 - tilt : M_PI_2];
      [controlPoints addObject:point];
    }
    NSDate *created = [base dateByAddingTimeInterval:index * 0.001];
    PKStrokePath *path = [[PKStrokePath alloc] initWithControlPoints:controlPoints creationDate:created];
    PKInk *ink = [[PKInk alloc] initWithInkType:INKInkTypeForBrush(info.type) color:INKColorFromHex(info.color)];
    [result addObject:[[PKStroke alloc] initWithInk:ink
                                         strokePath:path
                                          transform:CGAffineTransformIdentity
                                               mask:nil]];
    brushes[created] = info;
  }

  INKDecodedDrawing *decoded = [INKDecodedDrawing new];
  decoded.drawing = [[PKDrawing alloc] initWithStrokes:result];
  decoded.brushes = brushes;
  return decoded;
}

+ (nullable INKDecodedDrawing *)fail:(NSString *)reason
                           errorCode:(NSString **)errorCode
                             message:(NSString **)message
{
  *errorCode = @"E_INVALID_DOCUMENT";
  *message = reason;
  return nil;
}

@end
