import {Component, HostBinding, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ParamMap} from '@angular/router/src/shared';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';

import {Breadcrumb} from '../common/components/toolbar/toolbar.component';
import {BuildStatus} from '../common/constants';
import {Build, BuildLogLine} from '../models/build';
import {BuildLogMessageEvent, BuildLogWebsocketService} from '../services/build-log-websocket.service';
import {DataService} from '../services/data.service';

@Component({
  selector: 'fci-build',
  templateUrl: './build.component.html',
  styleUrls: ['./build.component.scss']
})
export class BuildComponent implements OnInit, OnDestroy {
  @HostBinding('class') classes = ['fci-full-height-container'];
  build: Build;
  // TODO: define interface for the logs
  logs: BuildLogLine[] = [];
  readonly BuildStatus = BuildStatus;
  websocketSubscription: Subscription;

  readonly breadcrumbs: Breadcrumb[] =
      [{label: 'Dashboard', url: '/'}, {hint: 'Project'}, {hint: 'Build'}];

  constructor(
      private readonly dataService: DataService,
      private readonly buildLogSocketService: BuildLogWebsocketService,
      private readonly route: ActivatedRoute) {}

  ngOnDestroy(): void {
    this.closeWebsocket();
  }

  ngOnInit(): void {
    this.route.paramMap
        .switchMap((params: ParamMap) => {
          const projectId = params.get('projectId');
          const buildNumber = +params.get('buildId');
          this.updateBreadcrumbsLink(projectId);
          this.connectLogSocket(projectId, buildNumber);
          return this.dataService.getBuild(projectId, buildNumber);
        })
        .subscribe((build: Build) => {
          this.build = build;
          if (build.isComplete()) {
            this.dataService
                .getBuildLogs(this.build.projectId, this.build.number)
                .subscribe((buildLogs => {
                  this.logs = buildLogs;
                }));

            this.closeWebsocket();
          }
          this.updateBreadcrumbsLabels(build.projectId, build.number);
        });
  }

  private connectLogSocket(projectId: string, buildNumber: number): void {
    this.websocketSubscription =
        this.buildLogSocketService.connect(projectId, buildNumber)
            .subscribe((message) => {
              // TODO: define a log line model.
              this.logs.push(JSON.parse(message.data));
            });
  }

  private closeWebsocket(): void {
    if (this.websocketSubscription) {
      this.websocketSubscription.unsubscribe();
    }
  }

  private updateBreadcrumbsLink(projectId: string): void {
    this.breadcrumbs[1].url = `/project/${projectId}`;
  }

  private updateBreadcrumbsLabels(projectName: string, buildNumber: number):
      void {
    // TODO: get project name from backend
    this.breadcrumbs[1].label = 'Project';
    this.breadcrumbs[2].label = `Build ${buildNumber}`;
  }
}
