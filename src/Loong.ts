import { ILineInputData, Line, PointerEvent, Rect } from "leafer-ui";
import type { Solution } from "src";
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
  motion_line: Line | null = null;
  motion_total: number = 0;
  motion_progress: number = 0;
  speed = 200;
  loop = false;
  head = new Rect({
    scale: 0.5, around: 'center', fill: {
      type: 'image',
      url: '/image/loong_head_1.png',
    }
  })
  claws = [
    new Rect({ width: 20, height: 40, around: 'bottom', fill: 'black' }),
    new Rect({ width: 20, height: 40, around: 'top', fill: 'gray' }),
    new Rect({ width: 20, height: 40, around: 'bottom', fill: 'black' }),
    new Rect({ width: 20, height: 40, around: 'top', fill: 'gray' })
  ]
  bodies: Rect[] = []
  tail = new Rect({ width: 20, height: 20, around: 'center', fill: 'red' })
  solution: Solution;
  state: LoongState = LoongState.Normal;

  set_motion_line(...args: ConstructorParameters<typeof Line>) {
    if (this.motion_line)
      this.solution.leafer.remove(this.motion_line);
    const l = this.motion_line = new Line(...args);
    this.solution.leafer.add(l);
    this.motion_total = l.getMotionTotal();
    this.motion_progress = 0;
  }

  constructor(solution: Solution, smoothing: Smoothing) {
    this.solution = solution;
    if (this.loop) smoothing.close()
    this.set_motion_line({
      ...line_input_data,
      path: smoothing.pen.path
    })
    for (let i = 0; i < 20; i++) {
      this.bodies.push(
        new Rect({ width: 20, height: 20, around: 'center', fill: 'blue' })
      )
    }
    solution.leafer.add(this.bodies);
    solution.leafer.add(this.claws);
    solution.leafer.add(this.tail);
    solution.leafer.add(this.head);
    this.head.on(PointerEvent.BEFORE_DOWN, this.on_pointer_down_head)
  }
  get_motion_point(to: number) {
    if (this.loop) {
      while (to < 0) {
        to += this.motion_total
      }
      to = to % this.motion_total;
    } else if (to >= this.motion_total) {
      to = this.motion_total;
    } else if (to <= 0) {
      to = 0
    }
    const percent = Math.min(this.motion_total ? (to / this.motion_total) : 0, 1 - Number.EPSILON);
    const ret = this.motion_line?.getMotionPoint({ type: 'percent', value: percent }) || { x: NaN, y: NaN, rotation: NaN };
    return ret
  }
  calc_length_offset(src: number, offset: number) {
    let dst = src + offset;
    if (this.loop) {
      if (dst < 0)
        dst = (this.motion_total + dst) % this.motion_total;
      if (dst > this.motion_total)
        dst = dst % this.motion_total;
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
    this.motion_progress += this.speed * dt / 1000;
    if (this.loop) this.motion_progress = this.motion_progress % this.motion_total;
    this.fly_to(this.motion_progress)
    if (LoongState.Leaving === this.state) {
      this.speed += 1 * dt
    }
  }
  on_pointer_down_head = () => {
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
    this.set_motion_line({
      ...line_input_data,
      path: smoothing.pen.path
    })
    this.solution.on_loong_hit(this)
  }
}