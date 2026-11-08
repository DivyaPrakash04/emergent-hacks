import Foundation
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count >= 3 else { print("usage: extract <in.mov> <outdir>"); exit(1) }
let url = URL(fileURLWithPath: a[1])
let outDir = a[2]
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: url)
let dur = CMTimeGetSeconds(asset.duration)
let track = asset.tracks(withMediaType: .video).first
var w: CGFloat = 0, h: CGFloat = 0
if let t = track {
    let s = t.naturalSize.applying(t.preferredTransform)
    w = abs(s.width); h = abs(s.height)
}
print(String(format: "DURATION %.2f s, native %.0fx%.0f", dur, w, h))

var fps = 2.0
if dur > 75 { fps = 1.5 }
if dur > 150 { fps = 1.0 }

let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
gen.requestedTimeToleranceAfter = CMTime(seconds: 0.05, preferredTimescale: 600)
gen.maximumSize = CGSize(width: 1120, height: 1120)

var i = 0
var t = 0.3
while t < dur - 0.05 {
    let time = CMTime(seconds: t, preferredTimescale: 600)
    do {
        let cg = try gen.copyCGImage(at: time, actualTime: nil)
        let rep = NSBitmapImageRep(cgImage: cg)
        if let d = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82]) {
            let p = String(format: "%@/frame_%03d.jpg", outDir, i)
            try d.write(to: URL(fileURLWithPath: p))
        }
        i += 1
    } catch {
        print("skip \(String(format: "%.1f", t)): \(error.localizedDescription)")
    }
    t += 1.0 / fps
}
print("EXTRACTED \(i) frames at \(fps) fps")
