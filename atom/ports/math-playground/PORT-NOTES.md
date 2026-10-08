# Math Playground / 数学游乐场

Original CindyJS and CindyGL engines, attributed distribution checksums in UPSTREAM.txt, Apache-2.0 license bundled. Three ATOM scenes use upstream CindyScript/geometry primitives: interactive Julia set (36 GPU iterations), a draggable 90-line envelope, and triangle/circumcircle/centroid geometry. Diagram and fractal colors represent scene content; controls follow system theme.

480×360 with a 480×272 drawing area, four 38px controls and no root scroll. The device's driver does not expose color-buffer float/half-float extensions; CindyGL correctly falls back to 8-bit textures for this scene. This is a curated mathematical playground, not the entire CindyJS authoring environment. No camera/network is needed.

Both scripts are bundled for offline use. Current source example snapshot and actual distributed engine header commit are separately recorded; do not imply those builds are identical. Reassemble wrappers with atom/tools/build_science_extras.py.
