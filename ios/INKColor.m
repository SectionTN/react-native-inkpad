#import "INKColor.h"

static CGFloat INKClamp(CGFloat value)
{
  return MIN(1, MAX(0, value));
}

NSString *INKHexFromColor(UIColor *color)
{
  CGFloat r = 0, g = 0, b = 0, a = 0;
  if (![color getRed:&r green:&g blue:&b alpha:&a]) {
    CGColorSpaceRef srgb = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGColorRef converted =
        CGColorCreateCopyByMatchingToColorSpace(srgb, kCGRenderingIntentDefault, color.CGColor, NULL);
    CGColorSpaceRelease(srgb);
    if (converted != NULL) {
      const CGFloat *components = CGColorGetComponents(converted);
      if (CGColorGetNumberOfComponents(converted) >= 4) {
        r = components[0];
        g = components[1];
        b = components[2];
        a = components[3];
      }
      CGColorRelease(converted);
    }
  }
  return [NSString stringWithFormat:@"#%02X%02X%02X%02X",
                                    (int)lround(INKClamp(r) * 255),
                                    (int)lround(INKClamp(g) * 255),
                                    (int)lround(INKClamp(b) * 255),
                                    (int)lround(INKClamp(a) * 255)];
}

UIColor *INKColorFromHex(NSString *hex)
{
  unsigned long long value = 0;
  [[NSScanner scannerWithString:[hex substringFromIndex:1]] scanHexLongLong:&value];
  return [UIColor colorWithRed:((value >> 24) & 0xFF) / 255.0
                         green:((value >> 16) & 0xFF) / 255.0
                          blue:((value >> 8) & 0xFF) / 255.0
                         alpha:(value & 0xFF) / 255.0];
}

BOOL INKIsHexColor(id value)
{
  if (![value isKindOfClass:NSString.class]) {
    return NO;
  }
  NSString *string = value;
  if (string.length != 9 || ![string hasPrefix:@"#"]) {
    return NO;
  }
  NSCharacterSet *digits = [NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdefABCDEF"];
  return [[string substringFromIndex:1] rangeOfCharacterFromSet:digits.invertedSet].location == NSNotFound;
}
