import { Animate } from '@leafer-in/animate';
import { App, Group, ITextInputData, Leafer, Line, PointerEvent, Rect, ResizeEvent, Text } from 'leafer-ui';
import FPS from './FPS';
import { __Render as Render } from './Render';
import { Smoothing } from './Smoothing';

const [_app, _leafer] = (1 ? () => {
  const app = new App({ view: window });
  const leafer = app.sky = app.addLeafer({ type: 'draw' })
  return [app, leafer] as const;
} : () => {
  const leafer = new Leafer({ view: window })
  const app = leafer;
  return [app, leafer] as const;
})()

enum ToolEnum {
  Pen = 1
}
class Solution {
  app = _app
  leafer = _leafer
  render_id: number = 0;
  ups = new FPS();
  ups_txt = new Text()
  draw_pen: Smoothing | null;
  tool: ToolEnum = ToolEnum.Pen;
  on_pointer_down_lb_map: Record<ToolEnum, (e: PointerEvent) => void> = {
    [ToolEnum.Pen]: (e: PointerEvent) => {
      this.draw_pen = new Smoothing
      this.leafer.add(this.draw_pen.pen)
      this.draw_pen.add_dot(e.x, e.y);
    }
  }
  on_pointer_move_lb_map: Record<ToolEnum, (e: PointerEvent) => void> = {
    [ToolEnum.Pen]: (e: PointerEvent) => {
      this.draw_pen.add_dot(e.x, e.y);
    }
  };
  on_pointer_up_lb_map: Record<ToolEnum, (e: PointerEvent) => void> = {
    [ToolEnum.Pen]: (e: PointerEvent) => {
      this.draw_pen.add_dot(e.x, e.y);
      this.draw_pen.close();

      const motion_line = new Line({
        motionPath: true,
        points: this.draw_pen.dots,
        stroke: 'red', windingRule: 'nonzero', strokeWidth: 4, strokeJoin: 'round', strokeCap: 'round'
      })
      this.leafer.add(motion_line)
      this.leafer.remove(this.draw_pen.pen)
      const a = motion_line.getMotionPoint(0);
      console.log(a)
      this.draw_pen = null;
    }
  };
  sky: Rect | null;
  bottom_clouds = new Group({ x: 0, y: this.leafer.height - 512 })
  bottom_clouds_anim: Animate | null;
  on_pointer_down = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1:
        this.on_pointer_down_lb_map[this.tool]?.(e);
        break;
    }
  }
  on_pointer_move = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1: this.on_pointer_move_lb_map[this.tool]?.(e); break;
    }
  }
  on_pointer_up = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1: this.on_pointer_up_lb_map[this.tool]?.(e); break;
    }
  }
  countdown_txt_style: () => ITextInputData = () => ({
    fill: 'yellow',
    stroke: '#FF5533',
    fontSize: 72,
    fontWeight: 'bold',
    opacity: 0,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeWidth: 5,
    x: this.app.width! / 2,
    y: this.app.height! / 2
  })
  countdown_texts = [
    new Text({ text: '三', ...this.countdown_txt_style() }),
    new Text({ text: '二', ...this.countdown_txt_style() }),
    new Text({ text: '一', ...this.countdown_txt_style() }),
    new Text({ text: '　开始！', ...this.countdown_txt_style() }),
  ]
  countdown() {
    this.countdown_texts.map((txt, i) => new Animate(
      txt,
      [
        { scale: 2, opacity: 0, },
        { scale: 1, opacity: 1, y: txt.y + 20, },
        {}, {},
        { scale: 2, opacity: 0 }
      ],
      { duration: 1, delay: (i - 1) }
    ))
  }
  init() {
    for (let i = -5; i < 10; ++i) {
      const cloud = new Rect({
        x: i * 512,
        fill: {
          type: 'image',
          url: '/image/bottom_cloud.png',
        }
      })
      this.bottom_clouds.add(cloud)
    }
    this.sky = new Rect({
      width: this.leafer.width,
      height: this.leafer.height,
      fill: {
        type: 'image',
        url: '/image/sunset_sky.png',
      }
    })
    this.bottom_clouds_anim = new Animate(this.bottom_clouds, { x: 512 }, { duration: 10, loop: true, easing: 'linear' })
    this.leafer.add(this.sky)
    this.leafer.add(this.bottom_clouds)
    this.leafer.add(this.ups_txt);
    this.leafer.add(this.countdown_texts);
    this.on_resize()
  }
  on_resize = () => {
    this.bottom_clouds.y = this.leafer.height - 512;
    this.bottom_clouds.scale = {
      x: 1,
      y: 1,
    };
    this.sky.width = this.leafer.width;
    this.sky.height = this.leafer.height;
    for (const txt of this.countdown_texts) {
      txt.x = this.leafer.width / 2;
      txt.y = this.leafer.height / 2;
    }
  }
  start() {
    this.app.on(PointerEvent.DOWN, this.on_pointer_down)
    this.app.on(PointerEvent.MOVE, this.on_pointer_move)
    this.app.on(PointerEvent.UP, this.on_pointer_up)
    this.app.on(ResizeEvent.RESIZE, this.on_resize)
    this.render_id = Render.add(this.render)
  }
  stop() {
    this.app.off(PointerEvent.DOWN, this.on_pointer_down)
    this.app.off(PointerEvent.MOVE, this.on_pointer_move)
    this.app.off(PointerEvent.UP, this.on_pointer_up)
    this.leafer.remove(this.ups_txt);
    Render.del(this.render_id);
  }
  render = (dt: number) => {
    this.ups.update(dt);
    this.ups_txt.text = 'UPS: ' + this.ups.value.toFixed(1);
  }
}

const solution = new Solution();
solution.init();
solution.start();


