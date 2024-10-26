import { Animate } from '@leafer-in/animate';
import '@leafer-in/motion-path';
import { App, Group, IKeyframe, ITextInputData, Leafer, PointerEvent, Rect, ResizeEvent, Text } from 'leafer-ui';
import FPS from './FPS';
import { Loong } from './Loong';
import { Smoothing } from './Smoothing';
import { Thunder } from './Thunder';

const [_app, _leafer] = (1 ? () => {
  const app = new App({ view: window });
  const leafer = app.tree = app.addLeafer({ type: 'draw' })
  return [app, leafer] as const;
} : () => {
  const leafer = new Leafer({ view: window })
  const app = leafer;
  return [app, leafer] as const;
})();
const countdown_txt_style: ITextInputData = {
  fill: 'yellow',
  stroke: '#FF5533',
  fontSize: 72,
  fontWeight: 'bold',
  opacity: 0,
  textAlign: 'center',
  verticalAlign: 'middle',
  strokeWidth: 3,
  x: (_leafer.width || 0) / 2,
  y: (_leafer.height || 0) / 2
}
export enum GameState {
  Idle,
  Countdown,
  Running,
  DrawPath,
}
export class Solution {
  app = _app
  leafer = _leafer
  update_id: number = 0;
  ups = new FPS();
  ups_txt = new Text({ opacity: 0.1 })
  score = 0;
  score_txt = new Text({
    ...countdown_txt_style,
    opacity: 1,
    fontSize: 36,
    text: '已点睛: 0',
    textAlign: 'left',
    verticalAlign: 'top',
    visible: false,
  })
  game_max_mseconds = 60 * 1000
  remain_mseconds = this.game_max_mseconds;
  remain_seconds_txt = new Text({
    ...countdown_txt_style,
    opacity: 1,
    fontSize: 36,
    textAlign: 'right',
    verticalAlign: 'top',
    visible: false,
  })
  draw_pen: Smoothing | null = null;
  game_state: GameState = GameState.Idle;
  max_loong_speed = 500;
  min_loong_speed = 100;
  loong_speed = this.min_loong_speed;
  max_loong_interval = 1000;
  min_loong_interval = 500;
  loong_interval = this.max_loong_interval
  loong_countdown = 0;
  on_pointer_down_lb_map: { [x in GameState]?: (e: PointerEvent) => void } = {
    [GameState.DrawPath]: (e: PointerEvent) => {
      this.draw_pen = new Smoothing
      this.leafer.add(this.draw_pen.pen)
      this.draw_pen.add_dot(e.x, e.y);
    },
    [GameState.Idle]: () => {
      this.countdown();
    },
    [GameState.Running]: void 0,
  }
  on_pointer_move_lb_map: { [x in GameState]?: (e: PointerEvent) => void } = {
    [GameState.DrawPath]: (e: PointerEvent) => {
      if (!this.draw_pen) return;
      this.draw_pen.add_dot(e.x, e.y);
    }
  };
  on_pointer_up_lb_map: { [x in GameState]?: (e: PointerEvent) => void } = {
    [GameState.DrawPath]: (e: PointerEvent) => {
      if (!this.draw_pen) return;
      this.draw_pen.add_dot(e.x, e.y);
      if (this.draw_pen.dots.length > 5) {
        const loong = new Loong(this);
        loong.read_smoothing_to_normal(this.draw_pen)
        this.loongs.push(loong);
      }
      this.leafer.remove(this.draw_pen.pen);
      this.draw_pen = null;
    }
  };
  sky: Rect | null = null;
  bottom_clouds_1 = new Group({ x: 0, y: this.height - 512 })
  black_sky: Rect | null = null;
  bottom_clouds_anim_1: Animate | null = null;
  bottom_clouds_2 = new Group({ x: 0, y: this.height - 1024 })
  bottom_clouds_anim_2: Animate | null = null;
  top_clouds_1 = new Group({ x: 0, y: 0 })
  top_clouds_anim_1: Animate | null = null;
  loongs: Loong[] = [];
  get width() { return this.leafer.width || 0 }
  get height() { return this.leafer.height || 0 }
  countdown_texts = [
    new Text({ text: '三', ...countdown_txt_style }),
    new Text({ text: '二', ...countdown_txt_style }),
    new Text({ text: '一', ...countdown_txt_style }),
    new Text({ text: '　开始！', ...countdown_txt_style }),
  ]
  on_pointer_down = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1:
        this.on_pointer_down_lb_map[this.game_state]?.(e);
        break;
    }
  }
  on_pointer_move = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1: this.on_pointer_move_lb_map[this.game_state]?.(e); break;
    }
  }
  on_pointer_up = (e: PointerEvent) => {
    switch (e.buttons) {
      case 1: this.on_pointer_up_lb_map[this.game_state]?.(e); break;
    }
  }
  countdown() {
    this.set_game_state(GameState.Countdown);
    this.countdown_texts.map((txt, i) => new Animate(
      txt,
      [
        { scale: 2, opacity: 0, },
        { scale: 1, opacity: 1, y: (txt.y || 0) + 20, },
        {}, {},
        { scale: 2, opacity: 0 }
      ],
      { duration: 1, delay: i }
    ))
    setTimeout(() => this.set_game_state(GameState.Running), 3000)
  }
  init() {
    for (let i = -3; i < 3; ++i) {
      this.top_clouds_1.add(new Rect({
        x: i * 512,
        y: 512 * 0.75,
        scaleX: -1,
        scaleY: -0.75,
        fill: {
          type: 'image',
          url: '/image/bottom_cloud.png',
        }
      }))
    }
    for (let i = -3; i < 5; ++i) {
      this.bottom_clouds_1.add(new Rect({
        x: i * 512,
        fill: {
          type: 'image',
          url: '/image/bottom_cloud.png',
        }
      }))
    }
    for (let i = -3; i < 5; ++i) {
      this.bottom_clouds_2.add(new Rect({
        x: i * 512,
        scaleX: -1,
        opacity: 0.5,
        fill: {
          type: 'image',
          url: '/image/bottom_cloud.png',
        }
      }))
    }
    this.sky = new Rect({
      width: this.leafer.width,
      height: this.leafer.height,
      fill: {
        type: 'image',
        url: '/image/sunset_sky.png',
      }
    })
    this.top_clouds_anim_1 = new Animate(
      this.top_clouds_1, [
      { x: 512 * 1, opacity: 0.5 },
      { x: 512 * 2, opacity: 0.25 },
      { x: 512 * 3, opacity: 0.5 }
    ], { duration: 30, loop: true, easing: 'linear' })
    this.black_sky = new Rect({
      width: this.leafer.width,
      height: this.leafer.height,
      fill: 'black',
      opacity: 0,
    })
    this.bottom_clouds_anim_1 = new Animate(
      this.bottom_clouds_1, [
      { x: 512 * 1, opacity: 0.9 },
      { x: 512 * 2, opacity: 0.4 },
      { x: 512 * 3, opacity: 0.9 }
    ], { duration: 10, loop: true, easing: 'linear' })
    this.bottom_clouds_anim_2 = new Animate(
      this.bottom_clouds_2, [
      { x: 512 * 1 * 1.5, opacity: 0.8 },
      { x: 512 * 2 * 1.5, opacity: 0.1 },
      { x: 512 * 3 * 1.5, opacity: 0.8 }
    ], { duration: 25, loop: true, easing: 'linear' })
    this.leafer.add(this.sky)
    this.leafer.add(this.black_sky)
    this.leafer.add(this.bottom_clouds_2)
    this.leafer.add(this.bottom_clouds_1)
    this.leafer.add(this.top_clouds_1)
    this.leafer.add(this.ups_txt);
    this.leafer.add(this.countdown_texts);
    this.leafer.add(this.score_txt)
    this.leafer.add(this.remain_seconds_txt)
    this.on_resize()
  }
  on_resize = () => {
    const { width: w = 0, height: h = 0 } = this.leafer;
    this.bottom_clouds_2.y = h - 512 * 1.5;
    this.bottom_clouds_2.scale = {
      x: 1 * 1.5,
      y: 1 * 1.5,
    };
    this.bottom_clouds_1.y = h - 512;
    this.bottom_clouds_1.scale = {
      x: 1,
      y: 1,
    };
    this.top_clouds_1.y = 0;
    this.top_clouds_1.scale = { x: 1, y: 1, };
    if (this.sky) {
      this.sky.width = w;
      this.sky.height = h;
    }
    if (this.black_sky) {
      this.black_sky.width = w;
      this.black_sky.height = h;
    }
    for (const txt of this.countdown_texts) {
      txt.x = w / 2;
      txt.y = h / 2;
    }
    this.score_txt.x = 10;
    this.score_txt.y = 10;
    this.remain_seconds_txt.x = w - 10;
    this.remain_seconds_txt.y = 10;

  }
  start() {
    this.app.on(PointerEvent.DOWN, this.on_pointer_down)
    this.app.on(PointerEvent.MOVE, this.on_pointer_move)
    this.app.on(PointerEvent.UP, this.on_pointer_up)
    this.app.on(ResizeEvent.RESIZE, this.on_resize)
    let prev_time = Date.now();
    setInterval(() => {
      const curr_time = Date.now();
      this.update(curr_time - prev_time);
      prev_time = curr_time;
    }, 1000 / 60)
    // this.update_id = Render.add(this.update)
  }
  stop() {
    this.app.off(PointerEvent.DOWN, this.on_pointer_down)
    this.app.off(PointerEvent.MOVE, this.on_pointer_move)
    this.app.off(PointerEvent.UP, this.on_pointer_up)
    this.leafer.remove(this.ups_txt);
    clearInterval(this.update_id)
  }
  update_game_remain_seconds() {
    this.remain_seconds_txt.text = `倒计时: ${(this.remain_mseconds / 1000).toFixed(0)}秒`;;
  }
  set_game_state(state: GameState) {
    switch (this.game_state) {
      case GameState.Idle: break;
      case GameState.Running:
        this.remain_seconds_txt.visible = false;
        break;
      case GameState.DrawPath: break;
    }
    this.game_state = state;
    switch (this.game_state) {
      case GameState.Idle:
        break;
      case GameState.Running:
        this.loong_countdown = 0;
        this.loong_interval = this.max_loong_interval;
        this.remain_mseconds = this.game_max_mseconds;
        this.remain_seconds_txt.visible = true;
        this.update_game_remain_seconds();
        break;
      case GameState.DrawPath: break;
    }
  }
  update = (dt: number) => {
    this.ups.update(dt);
    this.ups_txt.text = 'UPS: ' + this.ups.value.toFixed(1);
    for (const lonng of this.loongs) {
      lonng.update(dt)
    }
    switch (this.game_state) {
      case GameState.Idle: break;
      case GameState.Running:
        this.loong_countdown -= dt;

        if (this.loong_countdown <= 0) {
          this.loong_countdown = this.loong_interval;

          const what = Math.random() * this.game_max_mseconds;
          let methods: () => Smoothing;
          if (what < this.remain_mseconds / 2) {
            methods = this.create_a_motion
          } else if (what < this.remain_mseconds) {
            methods = this.create_b_motion
          } else {
            methods = this.create_c_motion
          }
          const smoothing = methods();

          const loong = new Loong(this);
          loong.speed = this.loong_speed
          loong.read_smoothing_to_normal(smoothing);
          this.loongs.push(loong)
        }
        this.loong_speed += (this.max_loong_speed - this.min_loong_speed) / 15000 * dt;
        this.loong_speed = Math.min(this.max_loong_speed, this.loong_speed)
        this.loong_interval -= (this.max_loong_interval - this.min_loong_interval) / 15000 * dt;
        this.loong_interval = Math.max(this.min_loong_interval, this.loong_interval)

        this.remain_mseconds -= dt;
        this.update_game_remain_seconds();
        if (this.remain_mseconds <= 0)
          this.set_game_state(GameState.Idle)
        break;
      case GameState.DrawPath:
        break;
    }
  }
  create_c_motion = () => {
    const w = this.width;
    const h = this.height;
    const y = h / 4 + Math.random() * h / 2;
    const left_to_right = Math.random() > 0.5;
    const smoothing = new Smoothing();
    let x = left_to_right ? (-200) : (w + 200)
    smoothing.add_dot(x, y);
    let i: 0 | 1 = 0;
    if (left_to_right) {
      while (x < w + 200) {
        i = (i + 1) % 2
        x += 200
        smoothing.add_dot(x, y + (i - 0.5) * Math.random() * 400);
      }
    } else {
      while (x > - 200) {
        i = (i + 1) % 2
        x -= 200
        smoothing.add_dot(x, y + (i - 0.5) * Math.random() * 400);
      }
    }
    smoothing.add_dot(x, y, 'last');
    return smoothing;
  }
  create_a_motion = () => {
    const w = this.width;
    const h = this.height;
    const start_y = h / 4 + Math.random() * h / 2;
    const center_y = Math.random() * h;
    const end_y = Math.random() * h;
    const left_to_right = Math.random() > 0.5;
    const smoothing = new Smoothing();
    smoothing.add_dot(left_to_right ? (-200) : (w + 200), start_y);
    smoothing.add_dot(w / 2, center_y);
    smoothing.add_dot(left_to_right ? (w + 200) : -200, end_y, 'last');
    return smoothing;
  }
  create_b_motion = () => {
    const w = this.width;
    const h = this.height;
    const y = h / 4 + Math.random() * h / 2;
    const left_to_right = Math.random() > 0.5;
    const smoothing = new Smoothing();
    let x = left_to_right ? (-200) : (w + 200)
    smoothing.add_dot(x, y);
    let i: 0 | 1 = 0;
    if (left_to_right) {
      while (x < w + 200) {
        i = (i + 1) % 2
        x += 200
        smoothing.add_dot(x, y + (i - 0.5) * 300);
      }
    } else {
      while (x > - 200) {
        i = (i + 1) % 2
        x -= 200
        smoothing.add_dot(x, y + (i - 0.5) * 300);
      }
    }
    smoothing.add_dot(x, y, 'last');
    return smoothing;
  }
  on_loong_hit(_loong: Loong) {
    this.score += 1;
    this.score_txt.text = '已点睛: ' + this.score;
    this.score_txt.visible = true;


    if (this.black_sky) {
      const state: IKeyframe[] = [
        { opacity: 1 },
        { opacity: 0 },
        { opacity: 0.8, fill: 'white' },
        { opacity: 0, fill: 'black' },
        { opacity: 1 },
        { opacity: 1 },
        { opacity: 1 },
        { opacity: 0 },
      ]
      for (let i = 0; i < 20; i++) state.push({})
      new Animate(this.black_sky, state, { duration: 5 })
    }
    new Thunder(this, _loong.head.x || 0, _loong.head.y || 0)
  }
}
const solution = new Solution();
solution.init();
solution.start();