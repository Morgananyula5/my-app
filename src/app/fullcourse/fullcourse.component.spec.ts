import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullcourseComponent } from './fullcourse.component';

describe('FullcourseComponent', () => {
  let component: FullcourseComponent;
  let fixture: ComponentFixture<FullcourseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FullcourseComponent]
    });
    fixture = TestBed.createComponent(FullcourseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
