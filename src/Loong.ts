import { Line, Rect } from "leafer-ui";
import type { Solution } from "src";
import { Smoothing } from "./Smoothing";

export class Loong {
  motion_line: Line | null = null;
  motion_total: number;
  speed = 200;
  loop = !0;
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
  motion_progress: number = 0;

  constructor(solution: Solution, smoothing: Smoothing) {
    if (this.loop) smoothing.close()
    this.motion_line = new Line({
      motionPath: true,
      path: smoothing.pen.path,
      stroke: 'red',
      windingRule: 'nonzero',
      strokeWidth: 4,
      strokeJoin: 'round',
      strokeCap: 'round'
    });
    solution.leafer.add(this.motion_line);
    this.motion_total =
      this.motion_line.getMotionTotal();
    for (let i = 0; i < 20; i++) {
      this.bodies.push(
        new Rect({ width: 20, height: 20, around: 'center', fill: 'blue' })
      )
    }
    solution.leafer.add(this.bodies);
    solution.leafer.add(this.claws);
    solution.leafer.add(this.tail);
    solution.leafer.add(this.head);
  }
  get_motion_point(to: number) {
    const { motion_line: line } = this;
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
    const ret = line.getMotionPoint(to);
    return ret;
  }
  motion_offset(src: number, offset: number) {
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

    to = this.motion_offset(to, -30)
    const claw_pos_a = Math.floor(bodies.length / 4);
    const claw_pos_b = Math.floor(3 * bodies.length / 4);
    for (let idx = 0; idx < bodies.length; idx++) {
      const body = bodies[idx];
      point = this.get_motion_point(to)
      if (!Number.isNaN(point.x) && !Number.isNaN(point.y)) {
        body.set(point)
        to = this.motion_offset(to, -25)
        if (idx === claw_pos_a) {
          claws[0].set(point)
          claws[1].set(point)
          claws[0].rotation -= 30
          claws[1].rotation += 30
        }
        if (idx === claw_pos_b) {
          claws[2].set(point)
          claws[3].set(point)
          claws[2].rotation -= 30
          claws[3].rotation += 30
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
    if (this.loop)
      this.motion_progress = this.motion_progress % this.motion_total;
    this.fly_to(this.motion_progress)
  }
}