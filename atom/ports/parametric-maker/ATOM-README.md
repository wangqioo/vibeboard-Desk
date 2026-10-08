# 参数造物
真实 JSCAD @jscad/modeling CSG引擎，源SHA与MIT许可证见UPSTREAM.txt / LICENSE。source-modeling包含完整建模源码与dist。Three.js/OrbitControls仅承担渲染，许可证见THREE-LICENSE。

三种预设：开口盒（实体差集生成壁/底）、直角支架（实体并集与圆孔差集）、圆孔底座（两个圆柱差集）。尺寸24–64mm、壁厚2–6mm；参数拖动只更新标注，点击生成才执行CSG。圆柱24/32段限制计算成本。没有挤入代码编辑器，也没有假装可导出或保存。

本地480×360 Chromium/SwiftShader测试无pageerror，开口盒40mm 28三角面，修改支架尺寸56mm重新生成168三角面。可拖动旋转、线框切换、归位，主控件48px。复杂CSG和软件GPU真机性能待验证。

完整目录应复制到app ID目录，entry-only bundle不是独立资源包。重新生成：python3 atom/tools/build_model_extras.py。
