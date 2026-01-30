export type HeapNode<T> = Readonly<{ id: string; value: T; priority: number }>;

export class MinHeap<T> {
  private arr: HeapNode<T>[] = [];

  size() {
    return this.arr.length;
  }

  toArray(): HeapNode<T>[] {
    return [...this.arr];
  }

  peek(): HeapNode<T> | null {
    return this.arr[0] ?? null;
  }

  push(node: HeapNode<T>) {
    this.arr.push(node);
    this.bubbleUp(this.arr.length - 1);
  }

  pop(): HeapNode<T> | null {
    if (this.arr.length === 0) return null;
    const top = this.arr[0]!;
    const last = this.arr.pop()!;
    if (this.arr.length > 0) {
      this.arr[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.arr[p]!.priority <= this.arr[i]!.priority) break;
      [this.arr[p], this.arr[i]] = [this.arr[i]!, this.arr[p]!];
      i = p;
    }
  }

  private bubbleDown(i: number) {
    const n = this.arr.length;
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.arr[l]!.priority < this.arr[smallest]!.priority)
        smallest = l;
      if (r < n && this.arr[r]!.priority < this.arr[smallest]!.priority)
        smallest = r;
      if (smallest === i) break;
      [this.arr[i], this.arr[smallest]] = [this.arr[smallest]!, this.arr[i]!];
      i = smallest;
    }
  }
}

