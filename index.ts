import FPS from 'FPS';
import { App, ITextInputData, Leafer, Pen, Point, PointerEvent, Text } from 'leafer-ui';
import { Animate } from '@leafer-in/animate'
import { __Render as Render } from 'Render';

const debug_1 = 1;
const [app, leafer] = (debug_1 ? () => {
  const app = new App({ view: window });
  const leafer = app.sky = app.addLeafer({ type: 'draw' })
  return [app, leafer] as const;
} : () => {
  const leafer = new Leafer({ view: window })
  const app = leafer;
  return [app, leafer] as const;
})()


class Smoothing {
  pen: Pen;
  first_dot: Point | null = null;
  prev_dot_a: Point | null = null;
  prev_dot_b: Point | null = null;
  line_factor = 0.3;
  smooth_factor = 0.3;
  min_curve_distance = 10;
  min_line_distance = 5;
  constructor() {
    this.pen = new Pen();
    this.pen.setStyle({ stroke: 'red', windingRule: 'nonzero', strokeWidth: 4, strokeJoin: 'round', strokeCap: 'round' })
  }
  add_dot(x: number, y: number, type?: 'last') {

    if (!this.first_dot) {
      this.first_dot = new Point({ x, y })
      this.prev_dot_a = this.first_dot.clone();
      this.prev_dot_b = this.first_dot.clone();
      this.pen.moveTo(x, y)
      return
    }
    const { x: a_x, y: a_y } = this.prev_dot_a
    const distance = Math.sqrt(Math.pow(x - a_x, 2) + Math.pow(y - a_y, 2));
    if (distance > this.min_curve_distance) {
      const { x: b_x, y: b_y } = this.prev_dot_b;
      const t_x_0 = a_x + (x - a_x) * this.line_factor;
      const t_y_0 = a_y + (y - a_y) * this.line_factor;
      const t_x_1 = x - (x - a_x) * this.line_factor;
      const t_y_1 = y - (y - a_y) * this.line_factor;
      const c_x_0 = b_x + (a_x - b_x) * this.smooth_factor // 第一控制点x坐标
      const c_y_0 = b_y + (a_y - b_y) * this.smooth_factor // 第一控制点y坐标
      const c_x_1 = a_x + (t_x_0 - a_x) * (1 - this.smooth_factor) // 第二控制点x坐标
      const c_y_1 = a_y + (t_y_0 - a_y) * (1 - this.smooth_factor) // 第二控制点y坐标
      this.pen.bezierCurveTo(c_x_0, c_y_0, c_x_1, c_y_1, t_x_0, t_y_0)
      this.prev_dot_b = new Point({ x: t_x_1, y: t_y_1 })
      this.prev_dot_a = new Point({ x, y })
      if (type === 'last') this.pen.lineTo(x, y);
    } else if (distance > this.min_line_distance) {
      this.prev_dot_b = new Point({ x, y })
      this.prev_dot_a = new Point({ x, y })
      this.pen.lineTo(x, y)
    } else if (type === 'last') {
      this.pen.lineTo(x, y)
    }
    if (type === 'last') {
      this.prev_dot_a = null;
      this.prev_dot_b = null;
      this.first_dot = null;
    }
  }
  close() {
    this.add_dot(this.first_dot.x, this.first_dot.y, 'last');
    this.pen.closePath()
  }
}
enum ToolEnum {
  Pen = 1
}
class Solution {
  render_id: number = 0;
  ups = new FPS();
  ups_txt = new Text()
  smoothing: Smoothing | null;
  tool: ToolEnum = ToolEnum.Pen;
  on_pointer_down_lb_map: Record<ToolEnum, (e: PointerEvent) => void> = {
    [ToolEnum.Pen]: (e: PointerEvent) => {
      this.smoothing = new Smoothing
      leafer.add(this.smoothing.pen)
      this.smoothing.add_dot(e.x, e.y);
    }
  }
  on_pointer_move_lb_map: Record<ToolEnum, (e: PointerEvent) => void> = {
    [ToolEnum.Pen]: (e: PointerEvent) => {
      this.smoothing.add_dot(e.x, e.y);
    }
  };
  on_pointer_up_lb_map: Record<ToolEnum, (e: PointerEvent) => void> = {
    [ToolEnum.Pen]: (e: PointerEvent) => {
      this.smoothing.add_dot(e.x, e.y);
      this.smoothing.close();
      this.smoothing = null;
    }
  };
  on_pointer_down = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1: this.on_pointer_down_lb_map[this.tool]?.(e); break;
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
    stroke: 'red',
    fontSize: 48,
    fontWeight: 'bold',
    opacity: 0,
    textAlign: 'center',
    verticalAlign: 'middle',
    x: app.width! / 2,
    y: app.height! / 2
  })
  countdown_txt_arr = [
    new Text({ text: '三', ...this.countdown_txt_style() }),
    new Text({ text: '二', ...this.countdown_txt_style() }),
    new Text({ text: '一', ...this.countdown_txt_style() }),
    new Text({ text: '　开始！', ...this.countdown_txt_style() }),
  ]
  countdown_txt_anim = this.countdown_txt_arr.map((txt, i) => new Animate(
    txt,
    [
      { scale: 2, opacity: 0, },
      { scale: 1, opacity: 1, y: txt.y + 20, },
      {}, {},
      { scale: 2, opacity: 0 }
    ],
    { duration: 1, delay: ++i }
  ))
  countdown() {
    for (const anim of this.countdown_txt_anim) {
      anim.play()
    }
  }
  start() {
    app.on(PointerEvent.DOWN, this.on_pointer_down)
    app.on(PointerEvent.MOVE, this.on_pointer_move)
    app.on(PointerEvent.UP, this.on_pointer_up)
    this.render_id = Render.add(this.render)
    leafer.add(this.ups_txt);
  }
  stop() {
    app.off(PointerEvent.DOWN, this.on_pointer_down)
    app.off(PointerEvent.MOVE, this.on_pointer_move)
    app.off(PointerEvent.UP, this.on_pointer_up)
    leafer.remove(this.ups_txt);
    Render.del(this.render_id);
  }
  render = (dt: number) => {
    this.ups.update(dt);
    this.ups_txt.text = 'UPS: ' + this.ups.value.toFixed(1);
  }
}

const solution = new Solution();
solution.start();