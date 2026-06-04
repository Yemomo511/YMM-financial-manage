import { Observable, Subject } from 'rxjs';

/**
 * @description RxJS 服务事件总线基类。
 * 每个服务独立持有私有 Subject，对外只暴露只读 Observable 事件流。
 */
export abstract class RxServiceBusBase<TEvent> {
  private readonly eventSubject = new Subject<TEvent>();

  readonly events$: Observable<TEvent> = this.eventSubject.asObservable();

  /**
   * 向当前服务自己的事件总线发布事件。
   * @param event 服务事件
   * @returns 发布完成信号
   */
  protected emitEvent(event: TEvent): void {
    this.eventSubject.next(event);
  }

  /**
   * 关闭当前服务事件流。
   * @returns 关闭完成信号
   */
  complete(): void {
    this.eventSubject.complete();
  }
}
