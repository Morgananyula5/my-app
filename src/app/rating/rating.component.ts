/*// rating.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.css'],
})
export class RatingComponent {
  @Input() rating: number = 0;
  @Output() ratingChange = new EventEmitter<number>();

  stars: number[] = [1, 2, 3, 4, 5];

  rateStar() {
    // Logic to handle rating
    // You can implement your own logic to handle the rating behavior
    // For now, we will simply emit the selected rating
    this.ratingChange.emit(this.rating);
  }
}

*/