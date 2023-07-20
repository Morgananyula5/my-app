import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverSignupComponent } from './driver-signup.component';

describe('DriverSignupComponent', () => {
  let component: DriverSignupComponent;
  let fixture: ComponentFixture<DriverSignupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DriverSignupComponent]
    });
    fixture = TestBed.createComponent(DriverSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});