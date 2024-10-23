import { Pen, Point } from "leafer-ui";

export class Smoothing {
  pen: Pen;
  first_dot: Point | null = null;
  prev_dot_a: Point | null = null;
  prev_dot_b: Point | null = null;
  line_factor = 0.5;
  smooth_factor = 0.5;
  min_curve_distance = 10;
  min_line_distance = 5;
  dots: Point[] = [];
  constructor() {
    this.pen = new Pen();
    this.pen.setStyle({ stroke: 'red', windingRule: 'nonzero', strokeWidth: 4, strokeJoin: 'round', strokeCap: 'round' })
  }
  add_dot(x: number, y: number, type?: 'last') {
    if (!this.first_dot || !this.prev_dot_a || !this.prev_dot_b) {
      this.dots = [new Point(x, y)]
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
      this.dots.push(new Point(x, y))
    } else if (distance > this.min_line_distance) {
      this.prev_dot_b = new Point({ x, y })
      this.prev_dot_a = new Point({ x, y })
      this.pen.lineTo(x, y)
      this.dots.push(new Point(x, y))
    } else if (type === 'last') {
      this.pen.lineTo(x, y)
      this.dots.push(new Point(x, y))
    }
    if (type === 'last') {
      this.prev_dot_a = null;
      this.prev_dot_b = null;
      this.first_dot = null;
    }
  }
  close() {
    if (!this.first_dot) return;
    this.add_dot(this.first_dot.x, this.first_dot.y, 'last');
    this.pen.closePath()
  }
}