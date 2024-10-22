

const handle_req_id_map = new Map<number, number>()

export interface RenderMethods {
  requestAnimationFrame(fn: (time: number) => void): number;
  cancelAnimationFrame(request_id: number): void;
}
export interface IRenderUtils {
  methods: RenderMethods;
  add(handler: (time: number) => void): number;
  del(handle: number): void;
}
export const __Render: IRenderUtils = {
  methods: globalThis,
  add(handler: (delta_time: number, time: number,) => void): number {
    let handle: number;
    let req_id: number;
    let prev_time: number;
    const func = (time: number) => {
      if (prev_time) handler(time - prev_time, time)
      prev_time = time;
      req_id = this.methods.requestAnimationFrame(func);
      handle_req_id_map.set(handle, req_id)
    }
    handle = req_id = this.methods.requestAnimationFrame(func)
    handle_req_id_map.set(handle, req_id)
    return handle;
  },
  del(handle: number): void {
    const req_id = handle_req_id_map.get(handle)
    if (req_id) this.methods.cancelAnimationFrame(req_id)
    handle_req_id_map.delete(handle)
  }
}
