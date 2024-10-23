import { ILineInputData, Line, PointerEvent, Rect } from "leafer-ui";
import { type Solution } from "src";
import { Smoothing } from "./Smoothing";
enum LoongState {
  Normal = 1,
  Leaving = 2,
}
const line_input_data: Partial<ILineInputData> = {
  motionPath: true,
  stroke: 'red',
  windingRule: 'nonzero',
  strokeWidth: 4,
  strokeJoin: 'round',
  strokeCap: 'round',
  visible: false,
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
    scale: 0.5, around: 'center', fill: {
      type: 'image',
      url: '/image/loong_head_1.png',
    }
  })
  claws = [
    new Rect({ x: -1000, y: -1000, width: 20, height: 40, around: 'bottom', fill: 'black' }),
    new Rect({ x: -1000, y: -1000, width: 20, height: 40, around: 'top', fill: 'gray' }),
    new Rect({ x: -1000, y: -1000, width: 20, height: 40, around: 'bottom', fill: 'black' }),
    new Rect({ x: -1000, y: -1000, width: 20, height: 40, around: 'top', fill: 'gray' })
  ]
  bodies: Rect[] = []
  tail = new Rect({ x: -1000, y: -1000, width: 20, height: 20, around: 'center', fill: 'red' })
  solution: Solution;
  state = LoongState.Normal;
  next_state = LoongState.Normal;
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
    for (let i = 0; i < 20; i++) {
      this.bodies.push(
        new Rect({ x: -1000, y: -1000, width: 20, height: 20, around: 'center', fill: 'blue' })
      )
    }
    solution.leafer.add(this.bodies);
    solution.leafer.add(this.claws);
    solution.leafer.add(this.tail);
    solution.leafer.add(this.head);
    this.head.on(PointerEvent.BEFORE_DOWN, this.on_pointer_down_head)
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
    if (this.state === LoongState.Normal) {
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
    if (this.state === LoongState.Normal && this.loop) {
      if (dst < 0)
        dst = (this.normal_motion_total + dst) % this.normal_motion_total;
      if (dst > this.normal_motion_total)
        dst = dst % this.normal_motion_total;
    }
    return dst;
  }
  fly_to(to: number): void {
    const { head, bodies, tail, claws } = this
    let point = this.get_motion_point(to);
    if (!Number.isNaN(point.x) && !Number.isNaN(point.y)) {
      if (point.rotation < -90 || point.rotation > 90) {
        head.scaleY = -0.5
      } else {
        head.scaleY = 0.5;
      }
      head.set(point)
    }
    to = this.calc_length_offset(to, -30)
    const claw_pos_a = Math.floor(bodies.length / 4);
    const claw_pos_b = Math.floor(3 * bodies.length / 4);
    for (let idx = 0; idx < bodies.length; idx++) {
      const body = bodies[idx];
      point = this.get_motion_point(to)
      if (!Number.isNaN(point.x) && !Number.isNaN(point.y)) {
        body.set(point)
        to = this.calc_length_offset(to, -25)
        if (idx === claw_pos_a) {
          claws[0].set(point)
          claws[1].set(point)
          claws[0].rotation = (claws[0].rotation || 0) - 30
          claws[1].rotation = (claws[1].rotation || 0) + 30
        }
        if (idx === claw_pos_b) {
          claws[2].set(point)
          claws[3].set(point)
          claws[2].rotation = (claws[2].rotation || 0) - 30
          claws[3].rotation = (claws[3].rotation || 0) + 30
        }
      }
    }
    point = this.get_motion_point(to)
    if (!Number.isNaN(point.x) && !Number.isNaN(point.y)) {
      tail.set(point)
    }
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
          break;
      }
    }
    switch (this.state) {
      case LoongState.Normal: {
        if (this.motion_progress >= 2 * this.normal_motion_total) {
          this.remove_self()
        }
        break;
      }
      case LoongState.Leaving: {
        this.speed += 1 * dt;
        setTimeout(() => this.remove_self(), 2000)
        break;
      }
    }
    this.motion_progress += this.speed * dt / 1000;
    if (this.loop) this.motion_progress = this.motion_progress % this.normal_motion_total;
    this.fly_to(this.motion_progress)
  }
  leave() {
    this.stop_at_progress = this.motion_progress;
    this.head.fill = {
      type: 'image',
      url: '/image/loong_head.png'
    }
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
    this.solution.on_loong_hit(this)
  }
  on_pointer_down_head = () => {
    if (this.state === LoongState.Normal)
      this.next_state = LoongState.Leaving
  }
}