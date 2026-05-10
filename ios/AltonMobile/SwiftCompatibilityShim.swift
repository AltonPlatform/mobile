// Таргет в основном Objective-C++/C++; статические Swift-поды (Lottie и др.) тянут символы
// __swift_FORCE_LOAD_$_swiftCompatibility*. Один компилируемый Swift-файл подключает Swift runtime
// и compatibility-библиотеки toolchain при линковке archive (в т.ч. Xcode Cloud).

import Foundation

@inline(never)
private func _keepSwiftRuntimeLinked() {
    _ = String(describing: NSObject.self)
}

/// Вызывается из ObjC при старте, чтобы оптимизатор не удалил модуль в Release.
@objc(ATMSwiftRuntimeShim)
public final class SwiftRuntimeShim: NSObject {
    @objc public static func ping() {
        _keepSwiftRuntimeLinked()
    }
}
