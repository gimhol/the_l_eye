import { ILineInputData, IRotationPointData, Line, PointerEvent, Rect, UI } from "leafer-ui";
import { type Solution } from "src";
import { Smoothing } from "./Smoothing";
import { bodyPath, clawLeftPath, clawRightPath, headPath, headWithEyePath, tailPath } from "./Svg";
enum LoongState {
  Idle = 0,
  Moving = 1,
  Leaving = 2,
}
const line_input_data: Partial<ILineInputData> = {
  motionPath: true,
  stroke: 'red',
  strokeWidth: 4,
  strokeJoin: 'round',
  strokeCap: 'round',
  visible: false,
}

const colors: string[] = [];
function reset_colors() {
  colors.length = 0;
  colors.push('red', 'green', 'brown', 'black')
}
export class Loong {
  z = 1;
  normal_motion_line: Line | null = null;
  normal_motion_total: number = 0;
  motion_progress: number = 0;
  stop_at_progress: number = 0;
  leaving_motion_line: Line | null = null;
  leaving_motion_total: number = 0;
  speed = 200;
  loop = false;
  head = new Rect({
    x: -1000, y: -1000,
    path: headPath,
    around: 'center',
    fill: 'lightgray',
    stroke: 'gray',
    scaleY: 2,
    scaleX: 2,
    strokeWidth: 1,
    hoverStyle: { fill: 'white' },
    pressStyle: { fill: 'black' },
  })
  claws = [
    new Rect({
      path: clawLeftPath, x: -1000, y: -1000, around: 'center',
      fill: 'lightgray',
      stroke: 'gray',
      scaleY: 2,
      scaleX: 2,
      strokeWidth: 1,
    }),
    new Rect({
      path: clawRightPath, x: -1000, y: -1000, around: 'center',
      fill: 'lightgray',
      stroke: 'gray',
      scaleY: 2,
      scaleX: 2,
      strokeWidth: 1,
    }),
    new Rect({
      path: clawLeftPath, x: -1000, y: -1000, around: 'center',
      fill: 'lightgray',
      stroke: 'gray',
      scaleY: 2,
      scaleX: 2,
      strokeWidth: 1,
    }),
    new Rect({
      path: clawRightPath, x: -1000, y: -1000, around: 'center',
      fill: 'lightgray',
      stroke: 'gray',
      scaleY: 2,
      scaleX: 2,
      strokeWidth: 1,
    })
  ]
  bodies: Rect[] = []
  tail = new Rect({
    path: tailPath, x: -1000, y: -1000, around: 'center',
    fill: 'lightgray',
    stroke: 'gray',
    scaleX: 2,
    scaleY: 2,
    strokeWidth: 1,
  })
  solution: Solution;
  state = LoongState.Moving;
  next_state = LoongState.Moving;
  bodies_length: number;
  claw_pos_a: number;
  claw_pos_b: number;
  set_normal_motion_line(...args: ConstructorParameters<typeof Line>) {
    if (this.normal_motion_line)
      this.solution.leafer.remove(this.normal_motion_line);
    const l = this.normal_motion_line = new Line(...args);
    this.solution.leafer.add(l);
    this.normal_motion_total = l.getMotionTotal();
    this.motion_progress = 0;
  }
  read_smoothing_to_normal(smoothing: Smoothing) {
    if (this.loop) smoothing.close();
    this.set_normal_motion_line({
      ...line_input_data,
      path: smoothing.pen.path
    })
  }
  set_leaving_motion_line(...args: ConstructorParameters<typeof Line>) {
    if (this.leaving_motion_line)
      this.solution.leafer.remove(this.leaving_motion_line);
    const l = this.leaving_motion_line = new Line(...args);
    this.solution.leafer.add(l);
    this.leaving_motion_total = l.getMotionTotal();
  }
  read_smoothing_to_leaving(smoothing: Smoothing) {
    if (this.loop) smoothing.close();
    this.set_leaving_motion_line({
      ...line_input_data,
      path: smoothing.pen.path
    })
  }
  constructor(solution: Solution) {
    this.solution = solution;
    for (let i = 0; i < 16; i++) {
      let scale = 1
      if (i < 5)
        scale -= (10 - i) / 30
      else if (i > 10)
        scale -= (i - 10) / 30
      this.bodies.push(
        new Rect({
          path: bodyPath,
          scaleY: scale * 2,
          scaleX: scale * 3,
          x: -1000, y: -1000,
          around: 'center',
          fill: 'lightgray',
          stroke: 'gray',
          strokeWidth: 0.5,
        })
      )
    }
    solution.leafer.add(this.bodies);
    solution.leafer.add(this.claws);
    solution.leafer.add(this.tail);
    solution.leafer.add(this.head);
    this.head.on(PointerEvent.BEFORE_DOWN, this.on_pointer_down_head)
    this.bodies_length = this.bodies.length;
    this.claw_pos_a = Math.floor(this.bodies_length / 4);
    this.claw_pos_b = Math.floor(3 * this.bodies_length / 4);
  }
  remove_self() {
    for (const i of this.bodies) {
      this.solution.leafer.remove(i);
    }
    for (const i of this.claws) {
      this.solution.leafer.remove(i)
    }
    this.solution.leafer.remove(this.tail);
    this.solution.leafer.remove(this.head);
    this.head.off(PointerEvent.BEFORE_DOWN, this.on_pointer_down_head)

    this.solution.loongs = this.solution.loongs.filter(v => v !== this)
    if (this.normal_motion_line)
      this.solution.leafer.remove(this.normal_motion_line);
    if (this.leaving_motion_line)
      this.solution.leafer.remove(this.leaving_motion_line);
  }
  get_motion_point(to: number) {
    if (this.state === LoongState.Moving) {
      if (this.loop) {
        while (to < 0) {
          to += this.normal_motion_total
        }
        to = to % this.normal_motion_total;
      } else if (to >= this.normal_motion_total) {
        to = this.normal_motion_total;
      } else if (to <= 0) {
        to = 0
      }
      const total = this.normal_motion_total;
      const line = this.normal_motion_line
      const percent = Math.min(total ? (to / total) : 0, 1 - Number.EPSILON);
      const ret = line?.getMotionPoint({ type: 'percent', value: percent }) || { x: NaN, y: NaN, rotation: NaN };
      return ret
    }
    if (to > this.stop_at_progress) {
      to -= this.stop_at_progress;
      const line = this.leaving_motion_line
      const total = this.leaving_motion_total;
      const percent = Math.min(total ? (to / total) : 0, 1 - Number.EPSILON);
      const ret = line?.getMotionPoint({ type: 'percent', value: percent }) || { x: NaN, y: NaN, rotation: NaN };
      return ret
    } else {
      const total = this.normal_motion_total;
      const line = this.normal_motion_line
      const percent = Math.min(total ? (to / total) : 0, 1 - Number.EPSILON);
      const ret = line?.getMotionPoint({ type: 'percent', value: percent }) || { x: NaN, y: NaN, rotation: NaN };
      return ret
    }
  }
  calc_length_offset(src: number, offset: number) {
    let dst = src + offset;
    if (this.state === LoongState.Moving && this.loop) {
      if (dst < 0)
        dst = (this.normal_motion_total + dst) % this.normal_motion_total;
      if (dst > this.normal_motion_total)
        dst = dst % this.normal_motion_total;
    }
    return dst;
  }


  update_ui_pos(ui: UI, point: IRotationPointData, rotate: number = 0) {
    if (Number.isNaN(point.x) || Number.isNaN(point.y)) return false;
    const old = ui.scaleY || 0;
    if (point.rotation < -90 || point.rotation > 90) {
      if (old > 0) { ui.scaleY = -1 * old; }
    } else {
      if (old < 0) ui.scaleY = -1 * old;
    }
    ui.set({ ...point, rotation: point.rotation + rotate })
    return true
  }
  fly_to(to: number): void {
    let point = this.get_motion_point(to);
    this.update_ui_pos(this.head, point)
    to = this.calc_length_offset(to, -30)
    for (let idx = 0; idx < this.bodies_length; idx++) {
      const body = this.bodies[idx];
      point = this.get_motion_point(to)
      if (this.update_ui_pos(body, point)) {
        to = this.calc_length_offset(to, -50)
        if (idx === this.claw_pos_a) {
          this.update_ui_pos(this.claws[0], point, -30)
          this.update_ui_pos(this.claws[1], point, 30)
        }
        if (idx === this.claw_pos_b) {
          this.update_ui_pos(this.claws[2], point, -30)
          this.update_ui_pos(this.claws[3], point, 30)
        }
      }
    }
    this.update_ui_pos(this.tail, this.get_motion_point(to))
  }
  update(dt: number) {
    if (this.next_state !== this.state) {
      // state leave job
      switch (this.state) { }

      this.state = this.next_state;

      // state enter job
      switch (this.state) {
        case LoongState.Leaving:
          this.leave();
          setTimeout(() => this.remove_self(), 2000)
          break;
      }
    }
    switch (this.state) {
      case LoongState.Moving: {
        this.update_flying(dt)
        if (this.motion_progress >= 2 * this.normal_motion_total) {
          this.remove_self()
        }
        break;
      }
      case LoongState.Leaving: {
        this.speed += 1 * dt;
        this.update_flying(dt)
        break;
      }
    }
  }
  update_flying(dt: number) {
    this.motion_progress += this.speed * dt / 1000;
    if (this.loop) this.motion_progress = this.motion_progress % this.normal_motion_total;
    this.fly_to(this.motion_progress)
  }
  leave() {
    this.stop_at_progress = this.motion_progress;
    this.state = LoongState.Leaving;
    const smoothing = new Smoothing();
    let y = this.head.y || 0;
    let x = this.head.x || 0;
    let i: 1 | 0 = ((this.head.scaleY || 0) > 0) ? 0 : 1;
    smoothing.add_dot(x, y)
    while (y > -200) {
      i = (i + 1) % 2
      x += 2 * (i - 0.5) * (50 + Math.random() * 200)
      y -= 100;
      smoothing.add_dot(x, y);
    }
    smoothing.add_dot(x, y, 'last')
    this.set_leaving_motion_line({
      ...line_input_data,
      path: smoothing.pen.path
    })
  }
  on_pointer_down_head = () => {
    this.head.path = headWithEyePath;

    this.head.hoverStyle = void 0
    this.head.pressStyle = void 0
    if (!colors.length) reset_colors();
    const colors_length = colors.length;
    const idx = Math.floor(Math.random() * colors_length) % colors_length;
    const stroke = colors.splice(idx, 1)[0]

    const fill = 'gold';
    this.head.stroke = stroke
    this.head.fill = fill
    this.bodies.forEach(v => {
      v.stroke = stroke
      v.fill = fill
    })
    this.tail.stroke = stroke;
    this.tail.fill = fill
    this.claws.forEach(v => {
      v.stroke = stroke
      v.fill = fill
    })
    this.solution.on_loong_hit(this)
    if (this.loop) {
      this.speed = 500;
      return;
    }
    if (this.state === LoongState.Moving)
      this.next_state = LoongState.Leaving
  }
}