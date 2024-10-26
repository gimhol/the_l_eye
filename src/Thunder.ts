import { Animate } from "@leafer-in/animate";
import { Ellipse, IKeyframe, Line } from "leafer-ui";
import type { Solution } from "src";
export class Thunder {
  constructor(
    solution: Solution,
    hit_x: number,
    hit_y: number
  ) {
    const radius = Math.sqrt(
      solution.width * solution.width +
      solution.height * solution.height
    ) / 2
    const angle = Math.random() * 2 * Math.PI;

    const start_x = solution.width / 2 + radius * Math.sin(angle);
    const start_y = solution.height / 2 + radius * Math.cos(angle)

    const diff_x = hit_x - start_x;
    const diff_y = hit_y - start_y;

    const diff_l = Math.sqrt(diff_x * diff_x + diff_y * diff_y)
    const direction_x = diff_x / diff_l;
    const direction_y = diff_y / diff_l;

    const line = new Line({
      points: [{
        x: start_x,
        y: start_y
      }, {
        x: start_x + direction_x * 3000,
        y: start_y + direction_y * 3000
      }],
      stroke: 'white',
      strokeWidth: 8,
    })
    solution.leafer.add(line)
    const anim_keys: IKeyframe[] = [
      { opacity: 1 },
      { opacity: 0 },
      { opacity: 0.8 },
      { opacity: 0 },
      { opacity: 1 },
      { opacity: 1 },
      { opacity: 0 },
      { opacity: 0 },
    ]
    for (let i = 0; i < 20; i++) anim_keys.push({})
    new Animate(line, anim_keys, { duration: 5 })

    setTimeout(() => {
      solution.leafer.remove(line)
    }, 5000)

    const flash_light = new Ellipse({
      x: hit_x,
      y: hit_y,
      around: 'center',
      width: 10,
      height: 10,
      opacity: 0,
      scale: 1,
      fill: 'white',
    })
    new Animate(flash_light, [
      { opacity: 1 },
      { opacity: 0.8, scale: 10, },
      { opacity: 0, scale: 20, fill: 'yellow' },
    ], { duration: 0.5 })

    solution.leafer.add(flash_light);
    setTimeout(() => {
      solution.leafer.remove(flash_light)
    }, 5000)
  }
}