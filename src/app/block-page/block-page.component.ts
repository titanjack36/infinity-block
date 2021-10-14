import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-block-page',
  templateUrl: './block-page.component.html',
  styleUrls: ['./block-page.component.css']
})
export class BlockPageComponent implements OnInit {

  blockedUrl: string | undefined;

  constructor(
    private activatedRoute: ActivatedRoute, 
    private window: Window) { 
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(async (params) => {
      this.blockedUrl = params.url;
    });
  }

  handleGoBack() {
    this.window.history.go(-2);
  }
}
