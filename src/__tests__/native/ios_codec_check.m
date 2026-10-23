#import <Foundation/Foundation.h>
#import <PencilKit/PencilKit.h>

#import "../../../ios/INKStrokeCodec.h"

// Decodes each fixture stroke, checks PencilKit's point sizes against the expected widths, then encodes it back.
static BOOL check(NSDictionary *fixture)
{
  NSString *brush = fixture[@"brush"];
  NSArray *input = fixture[@"points"];
  NSDictionary *doc = @{
    @"version" : @1,
    @"size" : @{@"width" : @400, @"height" : @400},
    @"strokes" : @[ @{
      @"brush" : @{@"type" : brush, @"color" : @"#000000FF", @"size" : fixture[@"size"]},
      @"input" : fixture[@"input"],
      @"points" : input,
    } ],
  };
  NSData *data = [NSJSONSerialization dataWithJSONObject:doc options:0 error:nil];
  NSString *code = nil;
  NSString *message = nil;
  INKDecodedDrawing *decoded = [INKStrokeCodec decode:[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]
                                            errorCode:&code
                                              message:&message];
  PKStroke *stroke = decoded.drawing.strokes.firstObject;
  NSArray *widths = fixture[@"widths"];
  BOOL ok = stroke != nil;
  for (NSUInteger i = 0; ok && widths && i < stroke.path.count; i++) {
    double expected = [brush isEqualToString:@"pen"] ? [widths[i] doubleValue] : [fixture[@"size"] doubleValue];
    if (fabs([stroke.path pointAtIndex:i].size.width - expected) > 1e-3) {
      printf("%s: point %lu is %.4f wide, expected %.4f\n", [fixture[@"name"] UTF8String], (unsigned long)i,
             [stroke.path pointAtIndex:i].size.width, expected);
      ok = NO;
    }
  }
  NSString *encoded = [INKStrokeCodec encodeDrawing:decoded.drawing size:CGSizeMake(400, 400) brushes:decoded.brushes];
  NSDictionary *back = [NSJSONSerialization JSONObjectWithData:[encoded dataUsingEncoding:NSUTF8StringEncoding]
                                                       options:0
                                                         error:nil];
  NSArray *output = back[@"strokes"][0][@"points"];
  ok = ok && output.count == input.count;
  for (NSUInteger i = 0; ok && i < input.count; i++) {
    if (fabs([output[i] doubleValue] - [input[i] doubleValue]) > 0.011) {
      printf("%s: channel %lu of point %lu came back as %g, was %g\n", [fixture[@"name"] UTF8String],
             (unsigned long)(i % 6), (unsigned long)(i / 6), [output[i] doubleValue], [input[i] doubleValue]);
      ok = NO;
    }
  }
  printf("%s %s\n", ok ? "ok" : "FAIL", [fixture[@"name"] UTF8String]);
  return ok;
}

int main(int argc, char **argv)
{
  @autoreleasepool {
    if (argc < 2) return 2;
    NSData *data = [NSData dataWithContentsOfFile:[NSString stringWithUTF8String:argv[1]]];
    NSDictionary *fixtures = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    NSMutableArray *strokes = [fixtures[@"strokes"] mutableCopy];
    [strokes addObject:@{
      @"name" : @"touch-with-pressure",
      @"brush" : @"marker",
      @"input" : @"touch",
      @"size" : @4,
      @"points" : @[ @10, @10, @0, @0.7, @-1, @-1, @30, @10, @16, @0.6, @-1, @-1 ],
    }];
    [strokes addObject:@{
      @"name" : @"stylus-with-every-channel",
      @"brush" : @"marker",
      @"input" : @"stylus",
      @"size" : @4,
      @"points" : @[ @10, @10, @0, @0.7, @0.5, @1.2, @30, @10, @16, @0.6, @0.4, @1.3 ],
    }];
    int failures = 0;
    for (NSDictionary *fixture in strokes) {
      if (!check(fixture)) failures++;
    }
    return failures == 0 ? 0 : 1;
  }
}
