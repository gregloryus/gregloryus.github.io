/*
 * A rectangle with `x` and `y` coordinates specifying the top-left corner and a `width` and `height`
 */
class Rect {

  // By default, positioned at [0, 0] with a width and height of 1
  constructor(x = 0, y = 0, width = 1, height = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /*
   * Return a new rectangle instance with the same values
   */
  copy() {
    return new Rect(this.x, this.y, this.width, this.height);
  }

}
