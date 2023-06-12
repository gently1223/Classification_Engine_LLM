import React from 'react';

// material-ui
import { Typography } from '@material-ui/core';

// project imports
import MainCard from '../../ui-component/cards/MainCard';
import Upload from '../../ui-component/upload';
import Link from '../../ui-component/link';

//==============================|| SAMPLE PAGE ||==============================//

const TrainBoard = () => {
    return (
        <MainCard title="Train Board" style={{padding: "-5px"}}>
            <div className="Card">
                <Upload />
            </div>
            <div className="Card">
                <Link />
            </div>
        </MainCard>
    );
};

export default TrainBoard;