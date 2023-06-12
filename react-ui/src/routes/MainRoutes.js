import React, { lazy } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';

// project imports
import MainLayout from './../layout/MainLayout';
import Loadable from '../ui-component/Loadable';
import AuthGuard from './../utils/route-guard/AuthGuard';
import { connect } from 'react-redux';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('../views/dashboard/Default')));

// sample page routing
const TrainBoard = Loadable(lazy(() => import('../views/trainboard')));

const ClassificationBoard = Loadable(lazy(() => import('../views/classificationboard')))

//-----------------------|| MAIN ROUTING ||-----------------------//

const MainRoutes = () => {
    const location = useLocation();

    return (
        <Route
            path={[
                '/dashboard',

                '/trainboard',

                '/classificationboard'
            ]}
        >
            <MainLayout>
                <Switch location={location} key={location.pathname}>
                    <AuthGuard>
                        <Route path="/dashboard" component={DashboardDefault} />

                        <Route path="/trainboard" component={TrainBoard} />

                        <Route path="/classificationboard" component={ClassificationBoard} />
                    </AuthGuard>
                </Switch>
            </MainLayout>
        </Route>
    );
};

const mapStateToProps = state => ({
    user: state.account.user
});

// export default MainRoutes;
export default connect(mapStateToProps)(MainRoutes);
