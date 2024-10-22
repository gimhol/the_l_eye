
/**
 * 帧率计算
 *
 * @export
 * @class FPS
 */
export default class FPS {
  /**
   * 帧率
   *
   * @readonly
   * @type {number}
   */
  get value(): number {
    return this._value;
  }

  /**
   * 帧率
   * 
   * @private
   * @type {number}
   */
  private _value: number = 0;

  /**
   * 帧间隔时间
   * 
   * @private
   * @type {number}
   */
  private _duration: number = 0;

  /**
   * 耗时保留率
   *
   * @private
   * @type {number}
   */
  private _retention: number = 0.01;

  /**
   * Creates an instance of FPS.
   *
   * @constructor
   * @param {number} [retention=0.01] 耗时保留率，范围[0, 0.99] 耗时保留率越大，fps的波动越平缓。
   */
  constructor(retention: number = 0.01) {
    this._retention = Math.min(Math.max(retention, 0), 0.99)
  }

  update(dt: number) {
    if (this._duration)
      this._duration = this._duration * (1 - this._retention) + dt * this._retention;
    else
      this._duration = dt;

    this._value = 1000 / this._duration;
  }

  reset() {
    this._value = 0;
    this._duration = 0;
  }
}
