require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Codegen before RN 0.84 rejects the spec with an unclear error, so stop here first.
react_native_version = begin
  react_native_package = IO.popen(["node", "--print", "require.resolve('react-native/package.json')"], chdir: Pod::Config.instance.installation_root.to_s, err: File::NULL, &:read).strip
  Gem::Version.new(JSON.parse(File.read(react_native_package))["version"])
rescue StandardError
  nil
end
if react_native_version && react_native_version.release < Gem::Version.new("0.84.0")
  raise "react-native-inkpad needs React Native 0.84 or newer (Expo SDK 56+), found #{react_native_version}. Upgrade React Native or install react-native-inkpad@0.1.1"
end

Pod::Spec.new do |s|
  s.name         = "ReactNativeInkpad"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/SectionTN/react-native-inkpad.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,c,swift,cpp}"
  s.private_header_files = "ios/**/*.h"
  s.frameworks   = "PencilKit"

  install_modules_dependencies(s)
end
